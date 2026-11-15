/** Why an upload stopped. `decode` and `too_large` come from compression, `server` from the action, `invalid` from a check made before starting. */
export type UploadFailReason = "decode" | "too_large" | "server" | "invalid";

/**
 * One upload from start to finish. Every state carries the `run` that produced
 * it, so a late event from a cancelled or replaced run can be recognised and dropped.
 * `queued` is a file waiting for its turn in a batch.
 */
export type UploadState<R = unknown> =
  | { status: "idle"; run: number }
  | { status: "queued"; run: number }
  | { status: "compressing"; run: number }
  | { status: "uploading"; run: number; note: string | null }
  | { status: "done"; run: number; result: R; note: string | null }
  | { status: "failed"; run: number; reason: UploadFailReason; message: string };

/**
 * Events. `queue`, `start`, `cancel` and `reset` introduce a run id (always
 * higher than the one before); the rest only apply to the run they name.
 */
export type UploadEvent<R = unknown> =
  | { type: "queue"; run: number }
  | { type: "start"; run: number }
  | { type: "compressed"; run: number; note: string | null }
  | { type: "uploaded"; run: number; result: R }
  | { type: "fail"; run: number; reason: UploadFailReason; message: string }
  | { type: "cancel"; run: number }
  | { type: "reset"; run: number };

/** The state before anything has happened. */
export function initialUpload<R = unknown>(run = 0): UploadState<R> {
  return { status: "idle", run };
}

/** True while a run is waiting, compressing or uploading. */
export function isUploadBusy(state: UploadState<unknown>): boolean {
  return state.status === "queued" || state.status === "compressing" || state.status === "uploading";
}

/** The compression note to show, if there is one. */
export function uploadNote(state: UploadState<unknown>): string | null {
  return state.status === "uploading" || state.status === "done" ? state.note : null;
}

/** The message to show for a failed run. */
export function uploadError(state: UploadState<unknown>): string | null {
  return state.status === "failed" ? state.message : null;
}

/** Progress for a bar. A failed run reports 0, never 100. */
export function uploadProgress(state: UploadState<unknown>): number {
  switch (state.status) {
    case "compressing":
      return 30;
    case "uploading":
      return 65;
    case "done":
      return 100;
    default:
      return 0;
  }
}

/** The admin string key for a compression failure. */
export function compressFailureKey(reason: "decode" | "too_large"): "errUploadCompressDecode" | "errUploadCompressStill" {
  return reason === "decode" ? "errUploadCompressDecode" : "errUploadCompressStill";
}

/** Pure transition function. Events for a run other than the current one, or out of order, leave the state as it is. */
export function uploadReducer<R>(state: UploadState<R>, event: UploadEvent<R>): UploadState<R> {
  switch (event.type) {
    case "queue":
      if (isUploadBusy(state) || state.status === "done" || event.run <= state.run) return state;
      return { status: "queued", run: event.run };
    case "start":
      if (state.status === "queued" && event.run === state.run) return { status: "compressing", run: event.run };
      if (!isUploadBusy(state) && event.run > state.run) return { status: "compressing", run: event.run };
      return state;
    case "compressed":
      return state.status === "compressing" && event.run === state.run ? { status: "uploading", run: state.run, note: event.note } : state;
    case "uploaded":
      return state.status === "uploading" && event.run === state.run ? { status: "done", run: state.run, result: event.result, note: state.note } : state;
    case "fail":
      return event.run === state.run && (state.status === "queued" || state.status === "compressing" || state.status === "uploading")
        ? { status: "failed", run: state.run, reason: event.reason, message: event.message }
        : state;
    case "cancel":
      return isUploadBusy(state) && event.run > state.run ? { status: "idle", run: event.run } : state;
    case "reset":
      return event.run > state.run ? { status: "idle", run: event.run } : state;
  }
}
