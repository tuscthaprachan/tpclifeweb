"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";

import { arm, claim, parseSpinRecord, SPIN_IDLE, SPIN_KEY, spinReduce, sameTarget, type SpinState } from "./spin-machine";

/** Fired on `window` after `armSpin`, so a spin to the address already showing can play without a navigation. */
export const SPIN_ARMED_EVENT = "canteen-spin-armed";

function currentHref(): string {
  return window.location.pathname + window.location.search;
}

/** Leaves a spin record for `target`, which the page that answers claims. */
export function armSpin(target: string): void {
  try {
    const record = arm(target, Date.now(), `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
    window.sessionStorage.setItem(SPIN_KEY, JSON.stringify(record));
    window.dispatchEvent(new Event(SPIN_ARMED_EVENT));
  } catch {}
}

/** Claims the stored record for this address, clearing it when it plays or has gone stale. Returns the nonce to play. */
function claimStored(): string | null {
  try {
    const record = parseSpinRecord(window.sessionStorage.getItem(SPIN_KEY));
    const result = claim(record, currentHref(), Date.now());
    if (result.kind === "play" || result.kind === "drop") window.sessionStorage.removeItem(SPIN_KEY);
    return result.kind === "play" ? result.nonce : null;
  } catch {
    return null;
  }
}

/**
 * The reel state for the result at `pickKey`. A spin plays once per nonce, so
 * Spin again to the same key plays again; Back, reloads and shared links never
 * do, and a flag armed for another address is left alone.
 */
export function useSpin(pickKey: string): { state: SpinState; done: () => void } {
  const [state, dispatch] = useReducer(spinReduce, SPIN_IDLE);
  const seenKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    const nonce = claimStored();
    if (nonce) dispatch({ type: "claimed", nonce });
    else if (seenKey.current !== pickKey) dispatch({ type: "reset" });
    seenKey.current = pickKey;
  }, [pickKey]);

  useEffect(() => {
    function onArmed() {
      try {
        const record = parseSpinRecord(window.sessionStorage.getItem(SPIN_KEY));
        if (!record || !sameTarget(record.target, currentHref())) return;
      } catch {
        return;
      }
      const nonce = claimStored();
      if (nonce) dispatch({ type: "claimed", nonce });
    }
    window.addEventListener(SPIN_ARMED_EVENT, onArmed);
    return () => window.removeEventListener(SPIN_ARMED_EVENT, onArmed);
  }, []);

  const nonce = state.status === "playing" ? state.nonce : null;
  const done = useCallback(() => {
    if (nonce) dispatch({ type: "done", nonce });
  }, [nonce]);

  return { state, done };
}
