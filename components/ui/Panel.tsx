import type { ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import { cx } from "./cx";
import { Heading } from "./Heading";

interface PanelProps {
  headingLevel: HeadingLevel;
  title: ReactNode;
  children?: ReactNode;
  tone?: "action" | "success";
  className?: string;
}

/**
 * `text-action-ink` on `bg-action` is the pair check-contrast.mjs asserts
 * directly (8.34:1). `text-inverse` on `bg-success` is not asserted by name,
 * but contrast ratio is symmetric in its two colours, so it is the same
 * 5.42:1 the script already proves for `--status-success` on white.
 */
const TONE_CLASS: Record<NonNullable<PanelProps["tone"]>, string> = {
  action: "bg-action text-action-ink",
  success: "bg-success text-ink-inverse",
};

/** A prominent confirmation panel, for the end of a completed task. */
export function Panel({ headingLevel, title, children, tone = "action", className }: PanelProps) {
  return (
    <div className={cx("rounded-panel px-[var(--space-6)] py-[var(--space-8)] text-center", TONE_CLASS[tone], className)}>
      <Heading level={headingLevel} className="m-0">
        {title}
      </Heading>
      {children ? <div className="mt-[var(--space-2)]">{children}</div> : null}
    </div>
  );
}
