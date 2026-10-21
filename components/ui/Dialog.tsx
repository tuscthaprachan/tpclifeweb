"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Heading } from "./Heading";
import { CloseIcon } from "./icons";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  headingLevel: HeadingLevel;
  locale: Locale;
  children: ReactNode;
  className?: string;
}

/**
 * Native `<dialog>` opened with `showModal()`. The focus trap and Escape
 * handling are the browser's own: Escape always closes it because nothing
 * here calls `preventDefault()` on the dialog's `cancel` event, which is the
 * one thing that would defeat that guarantee.
 */
export function Dialog({ open, onClose, title, headingLevel, locale, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cx(
        "rounded-panel border border-line bg-surface p-0 text-ink-900 shadow-[var(--shadow-elevation)] backdrop:bg-[rgb(31_26_28/0.5)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-[var(--space-4)] border-b border-line px-[var(--space-4)] py-[var(--space-3)]">
        <Heading level={headingLevel} id={titleId} className="m-0">
          {title}
        </Heading>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] text-ink-600 hover:bg-surface-alt hover:text-ink-900"
        >
          <CloseIcon />
          <span>{UI.close[locale]}</span>
        </button>
      </div>
      <div className="px-[var(--space-4)] py-[var(--space-4)]">{children}</div>
    </dialog>
  );
}
