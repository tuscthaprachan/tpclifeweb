import type { ReactNode } from "react";
import { cx } from "./cx";

interface ErrorMessageProps {
  /** Must be `${fieldId}-error`, matching the convention `describedBy()` builds in lib/a11y. */
  id: string;
  children: ReactNode;
  className?: string;
}

/** A single field's inline error (3.3.1). Pairs with ErrorSummary at the top of the form, never used alone. */
export function ErrorMessage({ id, children, className }: ErrorMessageProps) {
  return (
    <p id={id} className={cx("mt-[var(--space-1)] text-base font-medium text-error", className)}>
      {children}
    </p>
  );
}
