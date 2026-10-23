import { cx } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import type { LostFoundKind } from "@/lib/content/types";
import { FoundItemIcon, LostItemIcon } from "./icons";
import { kindLabel } from "./kindLabel";

interface LostFoundKindBadgeProps {
  kind: LostFoundKind;
  locale: Locale;
  className?: string;
}

/**
 * Lost and found is a new surface with no fill colour of its own
 * (CONTRIBUTING.md), so `kind` cannot be told apart by colour. It is told
 * apart by icon and word instead (1.4.1), matching every StatusTag on the
 * rest of the site: the icon never carries the meaning alone.
 */
export function LostFoundKindBadge({ kind, locale, className }: LostFoundKindBadgeProps) {
  const Icon = kind === "lost" ? LostItemIcon : FoundItemIcon;
  return (
    <span className={cx("inline-flex items-center gap-[var(--space-1)] text-sm font-medium text-ink-900", className)}>
      <Icon className="shrink-0" />
      <span>{kindLabel(kind, locale)}</span>
    </span>
  );
}
