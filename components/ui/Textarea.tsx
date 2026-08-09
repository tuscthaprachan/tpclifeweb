import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { describedBy } from "@/lib/a11y";
import { cx } from "./cx";
import { ErrorMessage } from "./ErrorMessage";

interface TextareaOwnProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Extra id appended to aria-describedby, for a composing component such as CharacterCount that adds its own live hint. */
  extraDescribedBy?: string;
}

type TextareaProps = TextareaOwnProps & Omit<ComponentPropsWithoutRef<"textarea">, keyof TextareaOwnProps>;

export function Textarea({ id, label, hint, error, className, extraDescribedBy, rows = 5, ...rest }: TextareaProps) {
  const describedByIds = [describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(error) }), extraDescribedBy].filter(Boolean).join(" ") || undefined;

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
      <textarea
        id={id}
        rows={rows}
        aria-describedby={describedByIds}
        aria-invalid={error ? true : undefined}
        className={cx(
          "rounded-control bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
          error ? "border-[var(--border-width-thick)] border-error" : "border border-line-strong",
        )}
        {...rest}
      />
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
    </div>
  );
}
