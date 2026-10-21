import type { ReactNode } from "react";
import { describedBy } from "@/lib/a11y";
import { cx } from "./cx";
import { ErrorMessage } from "./ErrorMessage";

interface FieldsetProps {
  legend: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id: string;
  className?: string;
}

/**
 * Groups a set of related controls (a Radios or Checkboxes group) under one
 * legend, the native way to name a group of native inputs, rather than an
 * aria-label on a wrapping div. Owns the group's hint and error text, so
 * Radios/Checkboxes render this instead of building their own.
 */
export function Fieldset({ legend, children, hint, error, id, className }: FieldsetProps) {
  return (
    <fieldset className={cx("m-0 border-0 p-0", className)} aria-describedby={describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(error) })}>
      <legend className="mb-[var(--space-2)] text-lg font-semibold text-ink-900">{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="mb-[var(--space-3)] text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
    </fieldset>
  );
}
