"use client";

/**
 * Marks the next /eat/pick page load as a spin the user asked for. A capture
 * listener on the document sees every click on a link and every submit of a
 * form that targets /eat/pick, so the controls themselves stay untouched. The
 * Randomiser reads the flag with `consumeSpin` and plays the reel only when it
 * is fresh, which keeps shared links, Back and reloads free of motion.
 */

import { useEffect } from "react";

const SPIN_KEY = "canteen-spin";
const SPIN_FRESH_MS = 10_000;
const PICK_PATH = /\/eat\/pick\/?$/;

function targetsPick(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return PICK_PATH.test(new URL(url, window.location.href).pathname);
  } catch {
    return false;
  }
}

function markSpin() {
  try {
    window.sessionStorage.setItem(SPIN_KEY, String(Date.now()));
  } catch {}
}

/** The id of the style element that keeps the server rendered result hidden until the reel takes over. */
export const SPIN_PENDING_ID = "canteen-spin-pending";

/** Runs before the result paints: hides it while a fresh spin waits for the reel, and shows it again after 5 s whatever happens. */
export const SPIN_PENDING_SCRIPT = `try{var r=sessionStorage.getItem(${JSON.stringify(SPIN_KEY)}),a=Date.now()-Number(r);if(r!==null&&a>=0&&a<${SPIN_FRESH_MS}&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!document.getElementById(${JSON.stringify(SPIN_PENDING_ID)})){var s=document.createElement("style");s.id=${JSON.stringify(SPIN_PENDING_ID)};s.textContent=".fun-result{visibility:hidden}";document.head.appendChild(s);setTimeout(function(){s.remove()},5000)}}catch(e){}`;

/** True once if a fresh spin flag exists. The flag is always cleared. */
export function consumeSpin(): boolean {
  try {
    const raw = window.sessionStorage.getItem(SPIN_KEY);
    if (raw === null) return false;
    window.sessionStorage.removeItem(SPIN_KEY);
    const age = Date.now() - Number(raw);
    return Number.isFinite(age) && age >= 0 && age < SPIN_FRESH_MS;
  } catch {
    return false;
  }
}

export function SpinListener() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (anchor && targetsPick(anchor.getAttribute("href"))) markSpin();
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (form && targetsPick(form.getAttribute("action"))) markSpin();
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
