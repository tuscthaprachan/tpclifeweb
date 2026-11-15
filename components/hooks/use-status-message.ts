"use client";

import { useCallback, useEffect, useReducer } from "react";
import { initialStatus, statusReducer, type StatusEvent, type StatusState } from "./status-machine";

export interface StatusMessage<T> {
  value: T | null;
  /** Key the rendered text on this so a repeated message is announced again. */
  nonce: number;
  show: (value: T) => void;
  clear: () => void;
}

/**
 * State for a polite live region. Pass `clearAfterMs` to drop the message after
 * a while; the timer is cleared on unmount and restarted by every `show`.
 */
export function useStatusMessage<T>(clearAfterMs?: number): StatusMessage<T> {
  const [state, dispatch] = useReducer(statusReducer as (s: StatusState<T>, e: StatusEvent<T>) => StatusState<T>, undefined, initialStatus<T>);
  const show = useCallback((value: T) => dispatch({ type: "show", value }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  useEffect(() => {
    if (clearAfterMs === undefined || state.value === null) return;
    const nonce = state.nonce;
    const timer = window.setTimeout(() => dispatch({ type: "expire", nonce }), clearAfterMs);
    return () => window.clearTimeout(timer);
  }, [clearAfterMs, state.nonce, state.value]);

  return { value: state.value, nonce: state.nonce, show, clear };
}
