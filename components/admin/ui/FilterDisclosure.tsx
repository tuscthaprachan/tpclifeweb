import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";

export interface FilterDisclosureProps {
  /** The summary text, e.g. "Filters". */
  label: string;
  /** Open to begin with, when a filter is already applied. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Filter fields behind a disclosure on a narrow screen, so they do not push the
 * list below the fold. From 48rem the summary is hidden and the fields always show.
 */
export function FilterDisclosure({ label, defaultOpen = false, children, className = "" }: FilterDisclosureProps) {
  return (
    <details className={`console-filters ${className}`} open={defaultOpen || undefined}>
      <summary>
        <ConsoleIcon name="filter" size={18} />
        <span>{label}</span>
        <ConsoleIcon name="chevronDown" size={16} className="console-filters-chevron" />
      </summary>
      {children}
    </details>
  );
}
