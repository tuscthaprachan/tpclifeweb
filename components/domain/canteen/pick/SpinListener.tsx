"use client";

/**
 * Marks the next /eat/pick page load as a spin the user asked for. A capture
 * listener on the document sees every click on a link and every submit of a
 * form that targets /eat/pick, so the controls themselves stay untouched. The
 * Randomiser claims the record with `useSpin` and plays the reel only when it
 * names this address and is fresh, which keeps shared links, Back and reloads free of motion.
 */

import { useEffect } from "react";

import { armSpin } from "./use-spin";

const PICK_PATH = /\/eat\/pick\/?$/;

/** The address to arm for a link or form target, or null when it is not /eat/pick. */
function pickTarget(url: string | null | undefined, keepQuery: boolean): string | null {
  if (!url) return null;
  try {
    const resolved = new URL(url, window.location.href);
    if (!PICK_PATH.test(resolved.pathname)) return null;
    return resolved.pathname + (keepQuery ? resolved.search : "");
  } catch {
    return null;
  }
}

export { SPIN_PENDING_ID, SPIN_PENDING_SCRIPT } from "./spin-machine";

export function SpinListener() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const target = anchor ? pickTarget(anchor.getAttribute("href"), true) : null;
      if (target) armSpin(target);
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      const target = form ? pickTarget(form.getAttribute("action"), false) : null;
      if (target) armSpin(target);
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);
  return null;
}
