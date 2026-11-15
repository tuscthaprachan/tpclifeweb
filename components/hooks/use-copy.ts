"use client";

import { useCallback } from "react";
import { useStatusMessage, type StatusMessage } from "./use-status-message";

export type CopyResult = "copied" | "failed";

/**
 * Copies text to the clipboard and keeps the outcome as a status message that
 * clears itself, so copying the same thing twice is announced twice.
 */
export function useCopy(clearAfterMs = 5000): StatusMessage<CopyResult> & { copy: (text: string) => Promise<CopyResult> } {
  const status = useStatusMessage<CopyResult>(clearAfterMs);
  const { show } = status;
  const copy = useCallback(
    async (text: string): Promise<CopyResult> => {
      try {
        await navigator.clipboard.writeText(text);
        show("copied");
        return "copied";
      } catch {
        show("failed");
        return "failed";
      }
    },
    [show],
  );
  return { ...status, copy };
}
