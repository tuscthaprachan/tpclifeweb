import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { formatMegabytes, type CompressResult } from "../compress-image";
import { compressInBrowser } from "../compress-image-browser";
import { compressFailureKey, type UploadEvent, type UploadFailReason } from "./upload-machine";

/** What a caller's upload function answers: the shape the shared server actions already return. */
export type UploadAttempt<R> = { ok: true; result: R } | { ok: false; error: string };

/** Sends the (compressed) file on. `file` is null when the form had none, so the server can say so. */
export type UploadFn<R> = (file: File | null) => Promise<UploadAttempt<R>>;

/** How a run ended. `cancelled` means the run was replaced or cancelled and nothing may act on it. */
export type UploadOutcome<R> =
  | { status: "done"; result: R; note: string | null }
  | { status: "failed"; reason: UploadFailReason; message: string }
  | { status: "cancelled" };

export interface RunUploadOptions<R> {
  run: number;
  file: File | null | undefined;
  locale: Locale;
  upload: UploadFn<R>;
  /** Receives every event for this run. */
  emit: (event: UploadEvent<R>) => void;
  /** False once the run was cancelled or replaced; no event is emitted after that. */
  isCurrent: () => boolean;
  compress?: (file: File) => Promise<CompressResult>;
}

/**
 * Compresses a picture, then hands it to `upload`. Never throws: an unexpected
 * error ends the run as a failure, so a caller's queue cannot be left waiting.
 */
export async function runUpload<R>({ run, file, locale, upload, emit, isCurrent, compress = compressInBrowser }: RunUploadOptions<R>): Promise<UploadOutcome<R>> {
  const send = (event: UploadEvent<R>) => {
    if (isCurrent()) emit(event);
  };
  const fail = (reason: UploadFailReason, message: string): UploadOutcome<R> => {
    if (!isCurrent()) return { status: "cancelled" };
    send({ type: "fail", run, reason, message });
    return { status: "failed", reason, message };
  };

  send({ type: "start", run });
  try {
    let toSend: File | null = null;
    let note: string | null = null;
    if (file && file.size > 0) {
      const compressed = await compress(file);
      if (!isCurrent()) return { status: "cancelled" };
      if (compressed.status === "failed") return fail(compressed.reason, a(compressFailureKey(compressed.reason), locale));
      if (compressed.status === "compressed") {
        note = a("imageCompressed", locale, { from: formatMegabytes(compressed.originalBytes), to: formatMegabytes(compressed.compressedBytes) });
      }
      toSend = compressed.file;
    }
    send({ type: "compressed", run, note });
    const attempt = await upload(toSend);
    if (!isCurrent()) return { status: "cancelled" };
    if (!attempt.ok) return fail("server", attempt.error);
    send({ type: "uploaded", run, result: attempt.result });
    return { status: "done", result: attempt.result, note };
  } catch {
    return fail("server", a("errUploadFailed", locale));
  }
}
