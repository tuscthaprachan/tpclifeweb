"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialReveal, outcomeEvent, REVEAL_AUTO_HIDE_MS, revealReducer, type RevealEvent, type RevealOutcome, type RevealState } from "./reveal-machine";

export interface UseRevealOptions<S, T> {
  /** The logged server action, unchanged; it is called with `initial` as the previous state. */
  action: (previous: S, formData: FormData) => Promise<S>;
  initial: S;
  /** Reads the value or the error out of the action's state; null when it carries neither. */
  select: (state: S) => RevealOutcome<T>;
  /** Shown when the action throws instead of returning a state. Without it a throw hides the value. */
  failureMessage?: string;
  /** Defaults to two minutes; 0 or less turns auto-hide off. */
  autoHideMs?: number;
}

export interface UseReveal<T> {
  state: RevealState<T>;
  /** True while the action runs. */
  pending: boolean;
  /** Pass as the form's `action`; runs the logged action and shows what it returns. */
  reveal: (formData: FormData) => Promise<void>;
  /** Drops the value. The next `reveal` runs the logged action again. */
  hide: () => void;
}

/**
 * Show and hide a logged, decrypted value. The value lives only in the
 * machine's `shown` state, so Hide and the auto-hide really discard it.
 */
export function useReveal<S, T>({ action, initial, select, failureMessage, autoHideMs = REVEAL_AUTO_HIDE_MS }: UseRevealOptions<S, T>): UseReveal<T> {
  const [state, dispatch] = useReducer((current: RevealState<T>, event: RevealEvent<T>) => revealReducer(current, event), undefined, initialReveal<T>);
  const latest = useRef(0);
  const config = useRef({ action, initial, select, failureMessage });
  useEffect(() => {
    config.current = { action, initial, select, failureMessage };
  });

  const reveal = useCallback(async (formData: FormData) => {
    const mine = ++latest.current;
    dispatch({ type: "request" });
    const { action: run, initial: start, select: read, failureMessage: failure } = config.current;
    let outcome: RevealOutcome<T>;
    try {
      outcome = read(await run(start, formData));
    } catch {
      outcome = failure ? { error: failure } : null;
    }
    if (mine === latest.current) dispatch(outcomeEvent(outcome));
  }, []);

  const hide = useCallback(() => {
    latest.current += 1;
    dispatch({ type: "hide" });
  }, []);

  const shownAt = state.status === "shown" ? state : null;
  useEffect(() => {
    if (!shownAt || autoHideMs <= 0) return;
    const timer = window.setTimeout(hide, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [shownAt, autoHideMs, hide]);

  return { state, pending: state.status === "revealing", reveal, hide };
}
