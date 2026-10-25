import type { ReactNode } from "react";
import { River } from "@/components/illustrations/River";
import { cx } from "./cx";

interface EmptyStateProps {
  /** e.g. UI.nothingHere[locale] or UI.searchNoResults[locale]. */
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Shows the river scene above the title. Pass false where space is tight, such as staff tables. */
  illustration?: boolean;
}

export function EmptyState({ title, children, action, className, illustration = true }: EmptyStateProps) {
  return (
    <div className={cx("rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-4)] py-[var(--space-6)] text-center", className)}>
      {illustration ? <River className="mx-auto mb-[var(--space-2)] h-[84px] w-[120px]" /> : null}
      <p className="m-0 text-lg font-semibold text-ink-900">{title}</p>
      {children ? <p className="mt-[var(--space-2)] text-ink-600">{children}</p> : null}
      {action ? <div className="mt-[var(--space-4)]">{action}</div> : null}
    </div>
  );
}
