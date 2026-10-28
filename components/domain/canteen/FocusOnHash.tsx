"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Moves focus to the element the address fragment names. A full page load
 * does this by itself; a client navigation scrolls to the fragment but leaves
 * focus where it was, so after "Show more" it would stay on the link. Renders
 * nothing.
 */
export function FocusOnHash() {
  const search = useSearchParams().toString();

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    target?.focus({ preventScroll: true });
  }, [search]);

  return null;
}
