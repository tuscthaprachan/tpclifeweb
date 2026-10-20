import { liveRegionProps } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { cx } from "@/components/ui/cx";
import { eat } from "./strings";

interface ResultCountProps {
  locale: Locale;
  dishes: number;
  stalls: number;
  className?: string;
}

/**
 * "23 dishes at 9 stalls", in a polite live region (4.1.3), so a screen
 * reader hears the new count once when a filter changes and not on every
 * keystroke. The region itself is always in the page; only its text changes.
 */
export function ResultCount({ locale, dishes, stalls, className }: ResultCountProps) {
  return (
    <p {...liveRegionProps("polite")} className={cx("m-0 text-lg font-semibold text-ink-900", className)}>
      {eat.resultCount(locale, dishes, stalls)}
    </p>
  );
}
