import type { ReactNode } from "react";
import { liveRegionProps, type Announcement } from "@/lib/a11y";
import { cx } from "./cx";

export type BannerVariant = "info" | "success" | "warning";

interface NotificationBannerProps {
  variant: BannerVariant;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<BannerVariant, string> = {
  info: "border-info bg-info-soft",
  success: "border-success bg-success-soft",
  warning: "border-warning bg-warning-soft",
};

/**
 * Warning banners interrupt (4.1.3 assertive); info and success wait for a
 * pause. A warning here means something the reader must act on now, not
 * just "this went well" or "here is some context".
 */
const POLITENESS: Record<BannerVariant, Announcement> = {
  info: "polite",
  success: "polite",
  warning: "assertive",
};

export function NotificationBanner({ variant, title, children, className }: NotificationBannerProps) {
  return (
    <div
      {...liveRegionProps(POLITENESS[variant])}
      className={cx(
        "rounded-panel border-l-[length:var(--border-width-thick)] px-[var(--space-4)] py-[var(--space-4)] text-ink-900",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <p className="m-0 font-semibold">{title}</p>
      <div className="mt-[var(--space-2)]">{children}</div>
    </div>
  );
}
