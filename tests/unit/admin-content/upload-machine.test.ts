import { describe, expect, it, vi } from "vitest";
import type { CompressResult } from "@/components/admin/content/compress-image";
import { runUpload, type UploadOutcome } from "@/components/admin/content/upload/run-upload";
import {
  compressFailureKey,
  initialUpload,
  isUploadBusy,
  uploadError,
  uploadNote,
  uploadProgress,
  uploadReducer,
  type UploadEvent,
  type UploadState,
} from "@/components/admin/content/upload/upload-machine";

const play = (events: UploadEvent<string>[], from: UploadState<string> = initialUpload<string>()) => events.reduce(uploadReducer<string>, from);

describe("uploadReducer", () => {
  it("walks start, compressed, uploaded", () => {
    expect(play([{ type: "start", run: 1 }]).status).toBe("compressing");
    const uploading = play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: "n" }]);
    expect(uploading).toEqual({ status: "uploading", run: 1, note: "n" });
    expect(play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: "n" }, { type: "uploaded", run: 1, result: "id" }])).toEqual({ status: "done", run: 1, result: "id", note: "n" });
  });

  it("queues, then starts the same run", () => {
    const queued = play([{ type: "queue", run: 3 }]);
    expect(queued).toEqual({ status: "queued", run: 3 });
    expect(isUploadBusy(queued)).toBe(true);
    expect(uploadProgress(queued)).toBe(0);
    expect(play([{ type: "start", run: 3 }], queued).status).toBe("compressing");
    expect(play([{ type: "start", run: 2 }], queued)).toBe(queued);
  });

  it("fails from any busy state and from queued, keeping the message", () => {
    const failed = play([{ type: "queue", run: 1 }, { type: "fail", run: 1, reason: "invalid", message: "alt" }]);
    expect(failed).toEqual({ status: "failed", run: 1, reason: "invalid", message: "alt" });
    expect(uploadError(failed)).toBe("alt");
    expect(play([{ type: "start", run: 1 }, { type: "fail", run: 1, reason: "decode", message: "m" }]).status).toBe("failed");
    expect(play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: null }, { type: "fail", run: 1, reason: "server", message: "m" }]).status).toBe("failed");
  });

  it("never reports progress 100 for a failed run", () => {
    const failed = play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: null }, { type: "fail", run: 1, reason: "server", message: "m" }]);
    expect(uploadProgress(failed)).toBe(0);
    expect(uploadProgress({ status: "done", run: 1, result: "x", note: null })).toBe(100);
    expect(uploadProgress({ status: "compressing", run: 1 })).toBe(30);
    expect(uploadProgress({ status: "uploading", run: 1, note: null })).toBe(65);
  });

  it("ignores events from another run", () => {
    const running = play([{ type: "start", run: 2 }]);
    expect(uploadReducer(running, { type: "compressed", run: 1, note: null })).toBe(running);
    expect(uploadReducer(running, { type: "fail", run: 1, reason: "server", message: "x" })).toBe(running);
  });

  it("ignores events out of order", () => {
    const idle = initialUpload<string>();
    expect(uploadReducer(idle, { type: "uploaded", run: 0, result: "x" })).toBe(idle);
    const compressing = play([{ type: "start", run: 1 }]);
    expect(uploadReducer(compressing, { type: "uploaded", run: 1, result: "x" })).toBe(compressing);
  });

  it("cancel returns to idle and drops the cancelled run's later events", () => {
    const uploading = play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: null }]);
    const cancelled = uploadReducer(uploading, { type: "cancel", run: 2 });
    expect(cancelled).toEqual({ status: "idle", run: 2 });
    expect(uploadReducer(cancelled, { type: "uploaded", run: 1, result: "late" })).toBe(cancelled);
    expect(uploadReducer(cancelled, { type: "fail", run: 1, reason: "server", message: "late" })).toBe(cancelled);
  });

  it("does not cancel a finished run, and reset clears it", () => {
    const done = play([{ type: "start", run: 1 }, { type: "compressed", run: 1, note: "n" }, { type: "uploaded", run: 1, result: "id" }]);
    expect(uploadReducer(done, { type: "cancel", run: 2 })).toBe(done);
    expect(uploadReducer(done, { type: "reset", run: 2 })).toEqual({ status: "idle", run: 2 });
    expect(uploadNote(done)).toBe("n");
    expect(uploadNote(uploadReducer(done, { type: "reset", run: 2 }))).toBeNull();
  });

  it("allows a retry after a failure with a new run", () => {
    const failed = play([{ type: "start", run: 1 }, { type: "fail", run: 1, reason: "decode", message: "m" }]);
    expect(uploadReducer(failed, { type: "start", run: 1 })).toBe(failed);
    expect(uploadReducer(failed, { type: "start", run: 2 }).status).toBe("compressing");
    expect(uploadReducer(failed, { type: "queue", run: 2 }).status).toBe("queued");
  });

  it("does not start a new run over one in flight", () => {
    const running = play([{ type: "start", run: 1 }]);
    expect(uploadReducer(running, { type: "start", run: 2 })).toBe(running);
  });
});

describe("compressFailureKey", () => {
  it("maps decode and the rest", () => {
    expect(compressFailureKey("decode")).toBe("errUploadCompressDecode");
    expect(compressFailureKey("too_large")).toBe("errUploadCompressStill");
  });
});

const picture = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });

function harness<R>(over?: { current?: () => boolean }) {
  const events: UploadEvent<R>[] = [];
  return { events, emit: (e: UploadEvent<R>) => events.push(e), isCurrent: over?.current ?? (() => true) };
}

describe("runUpload", () => {
  it("compresses, notes the saving, uploads and finishes", async () => {
    const h = harness<string>();
    const small = new File([new Uint8Array(2)], "p.jpg");
    const compress = vi.fn(async (): Promise<CompressResult> => ({ status: "compressed", file: small, originalBytes: 9.2 * 1024 * 1024, compressedBytes: 2.1 * 1024 * 1024 }));
    const upload = vi.fn(async () => ({ ok: true as const, result: "id" }));
    const out = await runUpload<string>({ run: 1, file: picture, locale: "en", upload, compress, ...h });
    expect(upload).toHaveBeenCalledWith(small);
    expect(out).toEqual({ status: "done", result: "id", note: "Compressed from 9.2 MB to 2.1 MB" });
    expect(h.events.map((e) => e.type)).toEqual(["start", "compressed", "uploaded"]);
  });

  it("maps a compression failure to its message without uploading", async () => {
    const h = harness<string>();
    const upload = vi.fn();
    const out = await runUpload<string>({ run: 1, file: picture, locale: "en", upload, compress: async () => ({ status: "failed", reason: "decode" }), ...h });
    expect(out.status).toBe("failed");
    expect(upload).not.toHaveBeenCalled();
    expect(play(h.events as UploadEvent<string>[], initialUpload<string>()).status).toBe("failed");
  });

  it("reports a server refusal", async () => {
    const h = harness<string>();
    const out = await runUpload<string>({ run: 1, file: picture, locale: "en", upload: async () => ({ ok: false, error: "No" }), compress: async () => ({ status: "unchanged", file: picture }), ...h });
    expect(out).toEqual({ status: "failed", reason: "server", message: "No" });
  });

  it("turns an unexpected throw into a failure, so a queue cannot stay locked", async () => {
    const h = harness<string>();
    const out = await runUpload<string>({
      run: 1,
      file: picture,
      locale: "en",
      upload: async () => {
        throw new Error("boom");
      },
      compress: async () => ({ status: "unchanged", file: picture }),
      ...h,
    });
    expect(out.status).toBe("failed");
    const final = h.events.reduce(uploadReducer<string>, initialUpload<string>());
    expect(final.status).toBe("failed");
    expect(isUploadBusy(final)).toBe(false);
  });

  it("also fails cleanly when compression throws", async () => {
    const h = harness<string>();
    const out = await runUpload<string>({ run: 1, file: picture, locale: "en", upload: vi.fn(), compress: async () => Promise.reject(new Error("x")), ...h });
    expect(out.status).toBe("failed");
  });

  it("sends nothing when no file was chosen and lets the server answer", async () => {
    const h = harness<string>();
    const upload = vi.fn(async () => ({ ok: false as const, error: "Choose a picture" }));
    const out = await runUpload<string>({ run: 1, file: null, locale: "en", upload, ...h });
    expect(upload).toHaveBeenCalledWith(null);
    expect(out.status).toBe("failed");
  });

  it("emits nothing and reports cancelled once the run is no longer current", async () => {
    let live = true;
    const h = harness<string>({ current: () => live });
    const onDone = vi.fn();
    const outcome: Promise<UploadOutcome<string>> = runUpload<string>({
      run: 1,
      file: picture,
      locale: "en",
      compress: async () => ({ status: "unchanged", file: picture }),
      upload: async () => {
        live = false;
        return { ok: true, result: "late" };
      },
      ...h,
    });
    const out = await outcome;
    if (out.status === "done") onDone();
    expect(out).toEqual({ status: "cancelled" });
    expect(onDone).not.toHaveBeenCalled();
    expect(h.events.map((e) => e.type)).toEqual(["start", "compressed"]);
  });

  it("is cancelled when cancelled during compression", async () => {
    let live = true;
    const h = harness<string>({ current: () => live });
    const upload = vi.fn();
    const out = await runUpload<string>({
      run: 1,
      file: picture,
      locale: "en",
      upload,
      compress: async () => {
        live = false;
        return { status: "unchanged", file: picture };
      },
      ...h,
    });
    expect(out.status).toBe("cancelled");
    expect(upload).not.toHaveBeenCalled();
  });
});
