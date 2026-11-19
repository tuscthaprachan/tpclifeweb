import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Heading, cx } from "@/components/ui";

export type SectionBarTone = "transport" | "activity" | "governance" | "action";

const TONE_CLASS: Record<SectionBarTone, string> = {
  transport: "bg-transport text-ink-on-fill",
  activity: "bg-activity text-ink-on-fill",
  governance: "bg-governance text-ink-on-fill",
  action: "bg-action text-action-ink",
};

interface SectionBarProps {
  id: string;
  tone: SectionBarTone;
  children: ReactNode;
  /** Shown at the end of the bar, outside the heading. */
  aside?: ReactNode;
  icon?: LucideIcon;
}

const BAR_CLASS = "rounded-[var(--radius-block)] px-[var(--space-4)] py-[var(--space-2)]";

export function SectionBar({ id, tone, children, aside, icon: Icon }: SectionBarProps) {
  const content = Icon ? (
    <span className="inline-flex items-center gap-[var(--space-2)]">
      <Icon className="size-[1.1em] shrink-0" strokeWidth={2.25} />
      <span>{children}</span>
    </span>
  ) : (
    children
  );
  if (aside) {
    return (
      <div className={cx("flex flex-wrap items-center justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]", BAR_CLASS, TONE_CLASS[tone])}>
        <Heading level={2} id={id} className={cx("m-0 font-bold", TONE_CLASS[tone])}>
          {content}
        </Heading>
        {aside}
      </div>
    );
  }
  return (
    <Heading
      level={2}
      id={id}
      className={cx("m-0 font-bold", BAR_CLASS, TONE_CLASS[tone])}
    >
      {content}
    </Heading>
  );
}
