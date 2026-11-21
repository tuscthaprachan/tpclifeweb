import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { River } from "@/components/illustrations/River";
import { cx } from "./cx";
import { DecorativeIcon } from "./route-icons";

interface EmptyStateProps {
  /** e.g. UI.nothingHere[locale] or UI.searchNoResults[locale]. */
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Shows the river scene above the title. Pass false where space is tight, such as staff tables. */
  illustration?: boolean;
  /** A small icon above the title, used where the illustration is turned off. */
  icon?: LucideIcon;
}

export function EmptyState({ title, children, action, className, illustration = true, icon }: EmptyStateProps) {
  return (
    <div className={cx("rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-4)] py-[var(--space-6)] text-center", className)}>
      {illustration ? (
        <River className="mx-auto mb-[var(--space-2)] h-[84px] w-[120px]" />
      ) : icon ? (
        <span aria-hidden="true" className="mx-auto mb-[var(--space-2)] grid size-12 place-items-center rounded-full bg-surface text-action">
          <DecorativeIcon icon={icon} size={24} />
        </span>
      ) : null}
      <p className="m-0 text-lg font-semibold text-ink-900">{title}</p>
      {children ? <p className="mt-[var(--space-2)] text-ink-600">{children}</p> : null}
      {action ? <div className="mt-[var(--space-4)]">{action}</div> : null}
    </div>
  );
}
