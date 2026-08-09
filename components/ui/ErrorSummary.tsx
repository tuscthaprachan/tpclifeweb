import type { ReactNode } from "react";
import { liveRegionProps, type HeadingLevel } from "@/lib/a11y";
import { cx } from "./cx";
import { Heading } from "./Heading";

export interface ErrorSummaryItem {
  /** "#field-id" of the control this error belongs to. */
  href: string;
  message: ReactNode;
}

interface ErrorSummaryProps {
  /** e.g. UI.errorSummaryTitle[locale]. */
  title: ReactNode;
  headingLevel: HeadingLevel;
  items: ErrorSummaryItem[];
  className?: string;
}

/**
 * Sits at the top of a form after a failed submit (3.3.1). `autoFocus` is
 * the plain HTML attribute, not a client-side focus() call: it works on the
 * server-rendered page that comes back after a full, JavaScript-off
 * submission, which is the case this component exists for.
 */
export function ErrorSummary({ title, headingLevel, items, className }: ErrorSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div
      {...liveRegionProps("assertive")}
      tabIndex={-1}
      autoFocus
      className={cx("rounded-panel border-[var(--border-width-thick)] border-error bg-error-soft px-[var(--space-4)] py-[var(--space-4)]", className)}
    >
      <Heading level={headingLevel} className="m-0 text-lg font-semibold text-ink-900">
        {title}
      </Heading>
      <ul className="m-0 mt-[var(--space-3)] list-none p-0">
        {items.map((item) => (
          <li key={item.href} className="mt-[var(--space-1)] first:mt-0">
            <a href={item.href} className="font-medium text-action underline hover:text-action-hover">
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
