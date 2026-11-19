import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import type { FilterChip } from "@/components/admin/ui";

const POPOVER =
  "absolute z-10 mt-[var(--space-1)] flex min-w-[16rem] max-w-[calc(100vw-2rem)] flex-col rounded-panel border border-line-strong bg-surface p-[var(--space-1)] shadow-[var(--shadow-elevation)] max-sm:start-0 sm:end-0";
const ITEM = "flex min-h-[var(--target-min)] items-center gap-[var(--space-2)] rounded-control px-[var(--space-3)] text-ink-900 no-underline hover:bg-surface-alt";

/** One primary control for the counter: a disclosure with the two ways to log a case. */
export function LogMenu({ label, foundLabel, foundHref, lostLabel, lostHref }: { label: string; foundLabel: string; foundHref: string; lostLabel: string; lostHref: string }) {
  return (
    <details className="relative">
      <summary className="inline-flex min-h-[var(--target-min)] cursor-pointer list-none items-center gap-[var(--space-2)] rounded-control bg-action px-[var(--space-4)] py-[var(--space-2)] font-medium text-action-ink hover:bg-action-hover [&::-webkit-details-marker]:hidden">
        <ConsoleIcon name="add" size={18} />
        <span>{label}</span>
        <ConsoleIcon name="chevronDown" size={16} />
      </summary>
      <ul className={`${POPOVER} m-0 list-none`}>
        <li>
          <Link href={foundHref} className={ITEM}>
            {foundLabel}
          </Link>
        </li>
        <li>
          <Link href={lostHref} className={ITEM}>
            {lostLabel}
          </Link>
        </li>
      </ul>
    </details>
  );
}

/** Pill links on one scrolling line, so they never push the list down on a phone. */
export function ChipRow({ label, options, current }: { label: string; options: FilterChip[]; current: string }) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none gap-[var(--space-2)] overflow-x-auto p-0 pb-[var(--space-1)] sm:flex-wrap">
        {options.map((option) => {
          const selected = option.id === current;
          return (
            <li key={option.id} className="shrink-0">
              <Link href={option.href} aria-current={selected ? "true" : undefined} className="console-chip whitespace-nowrap">
                {selected ? <ConsoleIcon name="check" size={14} /> : null}
                <span>{option.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A disclosure for filters that the chips do not cover. Closed unless one of them is in use. */
export function MoreFilters({ label, defaultOpen, children }: { label: string; defaultOpen: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="inline-flex min-h-[var(--target-min)] cursor-pointer list-none items-center gap-[var(--space-2)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] font-medium [&::-webkit-details-marker]:hidden">
        <ConsoleIcon name="filter" size={18} />
        <span>{label}</span>
        <ConsoleIcon name="chevronDown" size={16} className="group-open:rotate-180" />
      </summary>
      <div className="mt-[var(--space-3)]">{children}</div>
    </details>
  );
}
