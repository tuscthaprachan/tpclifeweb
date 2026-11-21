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
}

/**
 * A line of text with a small decorative icon before it, for metadata such as
 * a date, a place or a phone number. The icon is `aria-hidden`; the text
 * always carries the meaning. Text wraps under itself, not under the icon.
 */
export function IconText({ icon, children, className, size = 16 }: IconTextProps) {
  return (
    <span className={cx("inline-flex items-start gap-[var(--space-2)]", className)}>
      <DecorativeIcon icon={icon} size={size} className="mt-[0.2em]" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
