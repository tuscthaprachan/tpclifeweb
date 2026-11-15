"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface DisclosureOptions {
  /** Close when a pointer goes down outside the `<details>`. */
  closeOnOutsidePointer?: boolean;
  /** Close when keyboard focus moves to something outside the `<details>`. */
  closeOnFocusOut?: boolean;
  /** Close when a form inside the `<details>` is submitted. */
  closeOnSubmit?: boolean;
  /** Close whenever this value changes, for example the pathname. */
  closeOn?: string;
}

export interface Disclosure {
  detailsRef: RefObject<HTMLDetailsElement | null>;
  summaryRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** Pass to the `<details>` `onToggle`. */
  onToggle: (event: { currentTarget: { open: boolean } }) => void;
}

/**
 * Enhances a native `<details>` disclosure: tracks `open` for `aria-expanded`,
 * closes on Escape (returning focus to the summary) and on a link click, plus
 * the optional triggers in `options`. The disclosure works without JavaScript;
 * this only adds behaviour.
 */
export function useDisclosure(options: DisclosureOptions = {}): Disclosure {
  const { closeOnOutsidePointer = false, closeOnFocusOut = false, closeOnSubmit = false, closeOn } = options;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const details = detailsRef.current;
    if (!details) return;

    function close(returnFocus: boolean) {
      if (!details) return;
      details.open = false;
      if (returnFocus) summaryRef.current?.focus();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    function onPointerDown(event: PointerEvent) {
      if (!details?.contains(event.target as Node)) close(false);
    }
    function onFocusOut(event: FocusEvent) {
      const next = event.relatedTarget as Node | null;
      if (next && !details?.contains(next)) close(false);
    }
    function onClick(event: MouseEvent) {
      if ((event.target as HTMLElement).closest("a")) close(false);
    }
    function onSubmit() {
      close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    if (closeOnOutsidePointer) document.addEventListener("pointerdown", onPointerDown);
    if (closeOnFocusOut) details.addEventListener("focusout", onFocusOut);
    if (closeOnSubmit) details.addEventListener("submit", onSubmit);
    details.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      details.removeEventListener("focusout", onFocusOut);
      details.removeEventListener("submit", onSubmit);
      details.removeEventListener("click", onClick);
    };
  }, [open, closeOnOutsidePointer, closeOnFocusOut, closeOnSubmit]);

  useEffect(() => {
    if (detailsRef.current?.open) detailsRef.current.open = false;
  }, [closeOn]);

  return { detailsRef, summaryRef, open, onToggle: (event) => setOpen(event.currentTarget.open) };
}
