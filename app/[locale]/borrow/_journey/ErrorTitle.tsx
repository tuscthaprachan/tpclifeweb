"use client";

import { useEffect } from "react";

/** Puts the error prefix on the page title while the page shows an error summary, so a screen reader hears that something is wrong first. */
export function ErrorTitle({ prefix }: { prefix: string }) {
  useEffect(() => {
    const original = document.title;
    if (!original.startsWith(prefix)) document.title = prefix + original;
    return () => {
      document.title = original;
    };
  }, [prefix]);
  return null;
}
