import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export interface MetadataItem {
  term: ReactNode;
  value: ReactNode;
}

interface MetadataListProps {
  items: MetadataItem[];
  className?: string;
  /** Term over value at every width, for a narrow place such as a card. */
  compact?: boolean;
}

/** Facts about a page or a document: term in bold, value beside it from `sm`, stacked below. */
export function MetadataList({ items, className, compact = false }: MetadataListProps) {
  return (
    <dl className={cx("m-0 mb-[var(--space-6)] border-y border-line py-[var(--space-2)]", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cx(
            "grid gap-0 py-[var(--space-2)]",
            !compact && "sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-[var(--space-4)]",
            index > 0 && "border-t border-line",
          )}
        >
          <dt className="m-0 font-bold text-ink-900">{item.term}</dt>
          <dd className="m-0 min-w-0 text-ink-900 [overflow-wrap:anywhere]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
