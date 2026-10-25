import type { ReactNode } from "react";
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
}

export function SectionBar({ id, tone, children }: SectionBarProps) {
  return (
    <Heading
      level={2}
      id={id}
      className={cx("m-0 rounded-[var(--radius-block)] px-[var(--space-4)] py-[var(--space-2)] font-bold", TONE_CLASS[tone])}
    >
      {children}
    </Heading>
  );
}
