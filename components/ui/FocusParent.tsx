"use client";

import { useEffect, useRef } from "react";

/**
 * Moves focus to the element it sits in, once, when it appears. React's
 * `autoFocus` only focuses form controls, so a container that arrives by a
 * client side navigation (a Server Action redirect) needs this instead.
 */
export function FocusParent() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const target = ref.current?.parentElement;
    if (!target) return;
    target.focus({ preventScroll: true });
    const bottom = target.getBoundingClientRect().bottom + window.scrollY;
    if (bottom <= window.innerHeight) window.scrollTo({ top: 0, behavior: "instant" });
    else target.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  return <span ref={ref} hidden />;
}
