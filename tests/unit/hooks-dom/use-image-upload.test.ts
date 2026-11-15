// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompressResult } from "@/components/admin/content/compress-image";

const compress = vi.hoisted(() => vi.fn());
vi.mock("@/components/admin/content/compress-image-browser", () => ({ compressInBrowser: compress }));

import { useImageUpload } from "@/components/admin/content/upload/use-image-upload";
import { renderHook, step } from "../support/dom";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const picture = () => new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" });
const untouched = (file: File): CompressResult => ({ status: "unchanged", file }) as unknown as CompressResult;

beforeEach(() => {
  compress.mockReset();
  compress.mockImplementation(async (file: File) => untouched(file));
});

describe("useImageUpload", () => {
  it("compresses, uploads and ends done", async () => {
    const hook = await renderHook(() => useImageUpload<string>("en"));
    const upload = vi.fn(async () => ({ ok: true as const, result: "id-1" }));
    const outcome = await step(() => hook.current.start(picture(), upload));
    expect(outcome).toMatchObject({ status: "done", result: "id-1" });
    expect(hook.current.state).toMatchObject({ status: "done", result: "id-1" });
    expect(hook.current.busy).toBe(false);
  });

  it("uploads null when there is no file", async () => {
    const hook = await renderHook(() => useImageUpload<string>("en"));
    const upload = vi.fn(async () => ({ ok: false as const, error: "No file" }));
    const outcome = await step(() => hook.current.start(null, upload));
    expect(upload).toHaveBeenCalledWith(null);
    expect(outcome).toMatchObject({ status: "failed", reason: "server", message: "No file" });
    expect(hook.current.state).toMatchObject({ status: "failed", message: "No file" });
  });

  it("is busy while compressing", async () => {
    const d = deferred<CompressResult>();
    compress.mockImplementation(() => d.promise);
    const hook = await renderHook(() => useImageUpload<string>("en"));
    const file = picture();
    let p!: Promise<unknown>;
    await step(() => {
      p = hook.current.start(file, async () => ({ ok: true, result: "x" }));
    });
    expect(hook.current.state.status).toBe("compressing");
    expect(hook.current.busy).toBe(true);
    await step(async () => {
      d.resolve(untouched(file));
      await p;
    });
    expect(hook.current.state.status).toBe("done");
  });

  it("cancel mid-run makes the outcome cancelled and never reaches done", async () => {
    const d = deferred<CompressResult>();
    compress.mockImplementation(() => d.promise);
    const hook = await renderHook(() => useImageUpload<string>("en"));
    const file = picture();
    const upload = vi.fn(async () => ({ ok: true as const, result: "x" }));
    let p!: Promise<{ status: string }>;
    await step(() => {
      p = hook.current.start(file, upload);
    });
    await step(() => hook.current.cancel());
    expect(hook.current.state.status).toBe("idle");
    let outcome!: { status: string };
    await step(async () => {
      d.resolve(untouched(file));
      outcome = await p;
    });
    expect(outcome.status).toBe("cancelled");
    expect(upload).not.toHaveBeenCalled();
    expect(hook.current.state.status).toBe("idle");
  });

  it("cancel during the upload ignores its result", async () => {
    const d = deferred<{ ok: true; result: string }>();
    const hook = await renderHook(() => useImageUpload<string>("en"));
    let p!: Promise<{ status: string }>;
    await step(() => {
      p = hook.current.start(picture(), () => d.promise);
    });
    expect(hook.current.state.status).toBe("uploading");
    await step(() => hook.current.cancel());
    let outcome!: { status: string };
    await step(async () => {
      d.resolve({ ok: true, result: "x" });
      outcome = await p;
    });
    expect(outcome.status).toBe("cancelled");
    expect(hook.current.state.status).toBe("idle");
  });

  it("a second start while busy supersedes the first", async () => {
    const d = deferred<{ ok: true; result: string }>();
    const hook = await renderHook(() => useImageUpload<string>("en"));
    let first!: Promise<{ status: string }>;
    await step(() => {
      first = hook.current.start(picture(), () => d.promise);
    });
    await step(() => hook.current.start(picture(), async () => ({ ok: true, result: "second" })));
    let outcome!: { status: string };
    await step(async () => {
      d.resolve({ ok: true, result: "first" });
      outcome = await first;
    });
    expect(outcome.status).toBe("cancelled");
    expect(hook.current.state).toMatchObject({ status: "done", result: "second" });
  });

  it("reset returns to idle and drops the run", async () => {
    const hook = await renderHook(() => useImageUpload<string>("en"));
    await step(() => hook.current.start(picture(), async () => ({ ok: false, error: "bad" })));
    expect(hook.current.state.status).toBe("failed");
    await step(() => hook.current.reset());
    expect(hook.current.state.status).toBe("idle");
  });

  it("unmounting mid-run resolves cancelled without calling upload", async () => {
    const d = deferred<CompressResult>();
    compress.mockImplementation(() => d.promise);
    const hook = await renderHook(() => useImageUpload<string>("en"));
    const file = picture();
    const upload = vi.fn(async () => ({ ok: true as const, result: "x" }));
    let p!: Promise<{ status: string }>;
    await step(() => {
      p = hook.current.start(file, upload);
    });
    hook.unmount();
    d.resolve(untouched(file));
    expect((await p).status).toBe("cancelled");
    expect(upload).not.toHaveBeenCalled();
  });
});
