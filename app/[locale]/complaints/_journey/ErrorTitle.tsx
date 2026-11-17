"use client";

import { useEffect } from "react";

/** Puts the error prefix on the page title once an error summary is showing, so a screen reader hears it first. */
export function ErrorTitle({ prefix }: { prefix: string }) {
  useEffect(() => {
    if (!document.title.startsWith(prefix)) document.title = `${prefix}${document.title}`;
  }, [prefix]);
  return null;
}
