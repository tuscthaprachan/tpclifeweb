import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { describedBy } from "@/lib/a11y";
import { cx } from "./cx";
import { ErrorMessage } from "./ErrorMessage";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectOwnProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  className?: string;
}

type SelectProps = SelectOwnProps & Omit<ComponentPropsWithoutRef<"select">, keyof SelectOwnProps>;

export function Select({ id, label, hint, error, options, className, ...rest }: SelectProps) {
  return (
    /*
     * `min-w-0` is what keeps this inside 320 CSS px (1.4.10 Reflow).
     *
     * A select's min-content width is the width of its LONGEST OPTION, and a
     * flex item defaults to `min-width: auto`, which refuses to shrink below
     * that. So a filter whose options are long, for example the Directory's
     * faculty list with "College of Interdisciplinary Studies" in it, forced
     * its whole row to 437px on a 320px screen and scrolled the page
     * sideways. `min-w-0` lets the column shrink; `max-w-full` on the select
     * below then stops the control spilling out of it.
     *
     * Capping rather than forcing `w-full` on purpose: a select still takes
     * its natural width when there is room, and only gives way when there is
     * not, so short filters do not stretch across the row.
     */
    <div className={cx("flex min-w-0 flex-col gap-[var(--space-1)]", className)}>
      <label htmlFor={id} className="text-base font-medium text-ink-900">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        aria-describedby={describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(error) })}
        aria-invalid={error ? true : undefined}
        className={cx(
          "min-h-[var(--target-min)] max-w-full rounded-control bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
          error ? "border-[length:var(--border-width-thick)] border-error" : "border border-line-strong",
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
    </div>
  );
}
