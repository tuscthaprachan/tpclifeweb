import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cx } from "./cx";
import { DecorativeIcon } from "./route-icons";

interface IconTextProps {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Icon size in px. */
  size?: number;
  target?: boolean;
}

export const TARGET_LINE_PADDING = "py-[max(0px,calc((var(--target-min)-1lh)/2))]";

/**
 * A line of text with a small decorative icon before it, for metadata such as
 * a date, a place or a phone number. The icon is `aria-hidden`; the text
 * always carries the meaning. Text wraps under itself, not under the icon.
 */
export function IconText({ icon, children, className, size = 16, target = false }: IconTextProps) {
  return (
    <span className={cx("inline-flex items-start gap-[var(--space-2)]", className)}>
      <span className={cx("inline-flex shrink-0 items-center", target ? "h-[max(var(--target-min),1lh)]" : "h-[1lh]")}>
        <DecorativeIcon icon={icon} size={size} />
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
