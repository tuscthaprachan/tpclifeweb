"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useContentForm } from "./context";

interface SectionDisclosureProps {
  id: string;
  /** The rendered heading, shown in the clickable summary. */
  summary: ReactNode;
  hint?: ReactNode;
  defaultOpen?: boolean;
  /** Field names (or the start of them, "rows.") that belong to this section. An error on any of them opens it. */
  errorPrefixes?: readonly string[];
  children: ReactNode;
}

/**
 * A form section that can be folded away. It is a native `<details>`, so it
 * works without JavaScript and every field in it posts whether it is open or
 * closed. It opens by itself when one of its fields has an error and when a
 * link to it (or to a field inside it) is followed, so an error is never hidden.
 */
export function SectionDisclosure({ id, summary, hint, defaultOpen = false, errorPrefixes = [], children }: SectionDisclosureProps) {
  const { errors } = useContentForm();
  const hasError = Object.keys(errors).some((name) => errorPrefixes.some((prefix) => name === prefix || name.startsWith(prefix)));
  const [open, setOpen] = useState(defaultOpen || hasError);
  const [sawError, setSawError] = useState(hasError);
  const box = useRef<HTMLElement>(null);

  if (hasError !== sawError) {
    setSawError(hasError);
    if (hasError) setOpen(true);
  }

  useEffect(() => {
    const reveal = () => {
      const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
      if (target && box.current?.contains(target)) setOpen(true);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <section ref={box} id={id} className="console-card scroll-mt-[calc(var(--console-topbar-h)+4rem)]">
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="console-card-header min-h-[var(--target-min)] cursor-pointer marker:text-accent">{summary}</summary>
        <div className="console-card-body flex flex-col gap-[var(--space-5)]">
          {hint ? <p className="m-0 text-sm text-ink-600">{hint}</p> : null}
          {children}
        </div>
      </details>
    </section>
  );
}
