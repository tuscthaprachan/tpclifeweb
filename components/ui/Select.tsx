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
    <div className={cx("flex flex-col gap-[var(--space-1)]", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
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
          "min-h-[var(--target-min)] rounded-control bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
          error ? "border-[var(--border-width-thick)] border-error" : "border border-line-strong",
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
