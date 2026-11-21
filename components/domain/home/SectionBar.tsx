import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DecorativeIcon, Heading, cx } from "@/components/ui";

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
  /** Shown before the heading text. Decorative: the heading text carries the meaning. */
  icon?: LucideIcon;
}

const BAR_CLASS = "rounded-[var(--radius-block)] px-[var(--space-4)] py-[var(--space-2)]";

export function SectionBar({ id, tone, children, aside, icon }: SectionBarProps) {
  const content = icon ? (
    <>
      <DecorativeIcon icon={icon} size={22} />
      {children}
    </>
  ) : (
    children
  );
  const headingLayout = icon ? "flex items-center gap-[var(--space-2)]" : undefined;
  if (aside) {
    return (
      <div className={cx("flex flex-wrap items-center justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]", BAR_CLASS, TONE_CLASS[tone])}>
        <Heading level={2} id={id} className={cx("m-0 font-bold", headingLayout, TONE_CLASS[tone])}>
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
      className={cx("m-0 font-bold", headingLayout, BAR_CLASS, TONE_CLASS[tone])}
    >
      {content}
    </Heading>
  );
}
