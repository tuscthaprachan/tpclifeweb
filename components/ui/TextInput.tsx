import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { describedBy } from "@/lib/a11y";
import { cx } from "./cx";
import { ErrorMessage } from "./ErrorMessage";

interface TextInputOwnProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

type TextInputProps = TextInputOwnProps & Omit<ComponentPropsWithoutRef<"input">, keyof TextInputOwnProps>;

export function TextInput({ id, label, hint, error, className, type = "text", ...rest }: TextInputProps) {
  return (
    <div className={cx("flex flex-col gap-[var(--space-1)]", className)}>
      <label htmlFor={id} className="text-base font-medium text-ink-900">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type={type}
        aria-describedby={describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(error) })}
        aria-invalid={error ? true : undefined}
        className={cx(
          "min-h-[var(--target-min)] rounded-control bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
          error ? "border-[var(--border-width-thick)] border-error" : "border border-line-strong",
        )}
        {...rest}
      />
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
    </div>
  );
}
