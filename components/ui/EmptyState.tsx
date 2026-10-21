import type { ReactNode } from "react";
import { cx } from "./cx";

interface EmptyStateProps {
  /** e.g. UI.nothingHere[locale] or UI.searchNoResults[locale]. */
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx("rounded-panel border border-line bg-surface-alt px-[var(--space-4)] py-[var(--space-6)] text-center", className)}>
      <p className="m-0 text-lg font-semibold text-ink-900">{title}</p>
      {children ? <p className="mt-[var(--space-2)] text-ink-600">{children}</p> : null}
      {action ? <div className="mt-[var(--space-4)]">{action}</div> : null}
    </div>
  );
}
