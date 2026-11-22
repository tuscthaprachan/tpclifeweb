import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DecorativeIcon, Heading, cx } from "@/components/ui";

export type SectionBarTone = "transport" | "activity" | "governance" | "action";

interface SectionBarProps {
  id: string;
  /** Accepted for compatibility; every section heading uses the same neutral treatment. */
  tone?: SectionBarTone;
  children: ReactNode;
  /** Shown at the end of the heading row, outside the heading. */
  aside?: ReactNode;
  /** Shown before the heading text. Decorative: the heading text carries the meaning. */
  icon?: LucideIcon;
}

export function SectionBar({ id, children, aside, icon }: SectionBarProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b-2 border-ink-900 pb-[var(--space-2)]">
      <Heading level={2} id={id} className={cx("m-0 text-ink-900", icon && "flex items-center gap-[var(--space-2)]")}>
        {icon ? <DecorativeIcon icon={icon} size={22} /> : null}
        {children}
      </Heading>
      {aside}
    </div>
  );
}
