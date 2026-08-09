import { cx } from "./cx";
import { CheckIcon, ErrorIcon, InfoIcon, NeutralDotIcon, WarningIcon } from "./icons";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusTagProps {
  tone: StatusTone;
  /** Already localised by the caller, e.g. UI.statusDelivered[locale]. */
  label: string;
  className?: string;
}

const BG_CLASS: Record<StatusTone, string> = {
  success: "bg-success-soft",
  warning: "bg-warning-soft",
  error: "bg-error-soft",
  info: "bg-info-soft",
  neutral: "bg-neutral-soft",
};

/**
 * The icon carries the colour so it is verifiably compliant: `--ink-900` on
 * every `-soft` fill is one of the pairs check-contrast.mjs asserts at
 * 4.5:1, for all five tones. Colouring the label text itself instead would
 * put an unverified pair (status colour on its own soft tint) on the page,
 * so the label always stays `--ink-900` and the status colour lives only on
 * the decorative, `aria-hidden` icon.
 */
const ICON_CLASS: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  neutral: "text-neutral",
};

const ICON: Record<StatusTone, typeof CheckIcon> = {
  success: CheckIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
  neutral: NeutralDotIcon,
};

/**
 * 1.4.1: icon, word and colour, always together. A StatusTag with no visible
 * `label` text is a bug, which is why `label` is required rather than
 * optional.
 */
export function StatusTag({ tone, label, className }: StatusTagProps) {
  const Icon = ICON[tone];
  return (
    <span className={cx("inline-flex items-center gap-[var(--space-1)] rounded-pill px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium text-ink-900", BG_CLASS[tone], className)}>
      <Icon className={ICON_CLASS[tone]} />
      <span>{label}</span>
    </span>
  );
}
