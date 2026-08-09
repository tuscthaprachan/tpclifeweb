import type { ReactNode } from "react";
import { cx } from "./cx";

export interface SummaryListRow {
  key: ReactNode;
  value: ReactNode;
  /** A "Change" link or similar. Optional: most rows on this site are read-only. */
  actions?: ReactNode;
}

interface SummaryListProps {
  rows: SummaryListRow[];
  className?: string;
}

/**
 * The GOV.UK summary list pattern: a row of key, value, and an optional
 * action per row. Three columns from `sm` up; stacked key-over-value below
 * it, so nothing is ever forced into a horizontal scroll at 320px (1.4.10).
 */
export function SummaryList({ rows, className }: SummaryListProps) {
  return (
    <dl className={cx("m-0", className)}>
      {rows.map((row, index) => (
        <div
          key={index}
          className={cx(
            "flex flex-col gap-[var(--space-1)] border-b border-line py-[var(--space-3)]",
            "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-baseline sm:gap-[var(--space-4)]",
          )}
        >
          <dt className="text-sm font-medium text-ink-600 sm:text-base">{row.key}</dt>
          <dd className="m-0 text-ink-900">{row.value}</dd>
          {row.actions ? <dd className="m-0 sm:text-right">{row.actions}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
