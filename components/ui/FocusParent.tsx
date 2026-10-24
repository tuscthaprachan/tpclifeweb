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
    ref.current?.parentElement?.focus();
  }, []);
  return <span ref={ref} hidden />;
}
