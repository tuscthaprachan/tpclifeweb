"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Locale } from "@/lib/i18n/config";
import { runUpload, type UploadFn, type UploadOutcome } from "./run-upload";
import { initialUpload, isUploadBusy, uploadReducer, type UploadEvent, type UploadState } from "./upload-machine";

export interface ImageUpload<R> {
  state: UploadState<R>;
  /** True while compressing or uploading. */
  busy: boolean;
  /** Compresses `file` then calls `upload`. Resolves `cancelled` if `cancel`, `reset`, another `start` or unmounting got there first. */
  start: (file: File | null | undefined, upload: UploadFn<R>) => Promise<UploadOutcome<R>>;
  /** Drops the run in flight. Its result is ignored and its callbacks never fire. */
  cancel: () => void;
  /** Back to idle, also dropping any run in flight. Clears the note and the error. */
  reset: () => void;
}

/** The compress-then-upload pipeline for one picture, driven by `upload-machine`. */
export function useImageUpload<R>(locale: Locale): ImageUpload<R> {
  const [state, dispatch] = useReducer(uploadReducer as (s: UploadState<R>, e: UploadEvent<R>) => UploadState<R>, undefined, () => initialUpload<R>());
  const runRef = useRef(0);

  const start = useCallback(
    (file: File | null | undefined, upload: UploadFn<R>) => {
      dispatch({ type: "cancel", run: ++runRef.current });
      const run = ++runRef.current;
      return runUpload<R>({ run, file, locale, upload, emit: dispatch, isCurrent: () => runRef.current === run });
    },
    [locale],
  );
  const cancel = useCallback(() => dispatch({ type: "cancel", run: ++runRef.current }), []);
  const reset = useCallback(() => dispatch({ type: "reset", run: ++runRef.current }), []);

  useEffect(
    () => () => {
      runRef.current++;
    },
    [],
  );

  return { state, busy: isUploadBusy(state), start, cancel, reset };
}
