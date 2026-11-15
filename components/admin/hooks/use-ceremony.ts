"use client";

import { useCallback, useReducer, useRef } from "react";
import { ceremonyLocked, ceremonyReducer, initialCeremony, type CeremonyEvent, type CeremonyOutcome, type CeremonyState } from "./ceremony-machine";

export interface UseCeremony<K extends string> {
  state: CeremonyState<K>;
  /** True while running and after success, so the button cannot be pressed during navigation. */
  locked: boolean;
  /** The failure message key, or null. */
  failure: K | null;
  /** Runs `task`; on success calls `onSuccess` (the navigation) with the button still locked. */
  run: (task: () => Promise<CeremonyOutcome<K>>, onSuccess: () => void) => Promise<void>;
  /** Clears a shown failure, for example when the form is invalid before anything runs. */
  reset: () => void;
}

/** Runs a passkey ceremony through the machine in `ceremony-machine.ts`. */
export function useCeremony<K extends string>(): UseCeremony<K> {
  const [state, dispatch] = useReducer((current: CeremonyState<K>, event: CeremonyEvent<K>) => ceremonyReducer(current, event), undefined, initialCeremony<K>);
  const running = useRef(false);

  const run = useCallback(async (task: () => Promise<CeremonyOutcome<K>>, onSuccess: () => void) => {
    if (running.current) return;
    running.current = true;
    dispatch({ type: "start" });
    const outcome = await task();
    if (outcome.ok) {
      dispatch({ type: "succeeded" });
      onSuccess();
      return;
    }
    running.current = false;
    dispatch({ type: "failed", key: outcome.key });
  }, []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { state, locked: ceremonyLocked(state), failure: state.status === "failed" ? state.key : null, run, reset };
}
