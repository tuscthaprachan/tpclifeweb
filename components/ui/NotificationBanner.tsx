import { useId, type ReactNode } from "react";
import { liveRegionProps, type Announcement } from "@/lib/a11y";
import { cx } from "./cx";
import { FocusParent } from "./FocusParent";

export type BannerVariant = "info" | "success" | "warning";

interface NotificationBannerProps {
  variant: BannerVariant;
  title: ReactNode;
  children: ReactNode;
  /** Success banners take focus when they appear (GOV.UK). Pass false where several focus targets share a page, such as the design reference. */
  focusOnMount?: boolean;
  className?: string;
}

/**
 * The GOV.UK notification banner: a white body inside a solid border, with a
 * solid title bar in the same colour. There is no tinted fill. `info` and
 * `warning` are both the "important" banner (brand colour); only `success` is
 * green. The title bar carries the white (or, in dark mode, near-black) title
 * text, so the bar colour is never the only carrier of meaning (1.4.1).
 *
 * Pairs: `text-action-ink` on `bg-action` and `text-ink-inverse` on
 * `bg-success` are the ones Panel.tsx already documents and
 * check-contrast.mjs asserts.
 */
const BORDER_CLASS: Record<BannerVariant, string> = {
  info: "border-action",
  warning: "border-action",
  success: "border-success",
};

const BAR_CLASS: Record<BannerVariant, string> = {
  info: "bg-action text-action-ink",
  warning: "bg-action text-action-ink",
  success: "bg-success text-ink-inverse",
};

/**
 * GOV.UK: "important" banners are a labelled region (not announced);
 * "success" banners are an alert shown after an action and take focus. A
 * `warning` here means the reader must act, so it is announced assertively
 * without moving focus.
 */
const POLITENESS: Record<Exclude<BannerVariant, "info" | "success">, Announcement> = {
  warning: "assertive",
};

export function NotificationBanner({ variant, title, children, focusOnMount = true, className }: NotificationBannerProps) {
  const titleId = useId();
  const isSuccess = variant === "success";
  const roleProps = isSuccess
    ? { role: "alert" as const, tabIndex: -1 }
    : variant === "warning"
      ? { ...liveRegionProps(POLITENESS.warning), "aria-labelledby": titleId }
      : { role: "region" as const, "aria-labelledby": titleId };

  return (
    <div {...roleProps} data-inherit-heading-colour="" className={cx("border-[length:var(--border-width-thick)] bg-surface text-ink-900", BORDER_CLASS[variant], className)}>
      {isSuccess && focusOnMount ? <FocusParent /> : null}
      <h2 id={titleId} className={cx("m-0 px-[var(--space-4)] py-[var(--space-2)] text-base font-bold", BAR_CLASS[variant])}>
        {title}
      </h2>
      {children ? <div className="px-[var(--space-4)] py-[var(--space-4)]">{children}</div> : null}
    </div>
  );
}
