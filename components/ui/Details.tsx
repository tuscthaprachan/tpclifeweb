import type { ReactNode } from "react";
import { cx } from "./cx";

interface DetailsProps {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Native `<details>`. Use this instead of a tooltip: 1.4.13 forbids
 * hover-only content, and a native disclosure works without JavaScript, with
 * the keyboard, and with a screen reader for free.
 */
export function Details({ summary, children, className, defaultOpen }: DetailsProps) {
  return (
    <details className={cx("rounded-panel border border-line", className)} open={defaultOpen}>
      <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900 marker:text-accent">{summary}</summary>
      <div className="border-t border-line px-[var(--space-4)] py-[var(--space-3)] text-ink-900">{children}</div>
    </details>
  );
}
