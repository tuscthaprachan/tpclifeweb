import { Timestamp } from "@/components/ui/Timestamp";
import { cx } from "@/components/ui/cx";
import type { Locale } from "@/lib/i18n/config";
import { EAT, t } from "./strings";

interface CheckedOnNoteProps {
  /** "YYYY-MM-DD", the day every dish in the list was checked. */
  checkedOn: string;
  locale: Locale;
  className?: string;
}

/** "Price checked on <date>" once for a whole list, in place of the same line on every card. */
export function CheckedOnNote({ checkedOn, locale, className }: CheckedOnNoteProps) {
  return (
    <p className={cx("m-0 text-sm text-ink-600", className)}>
      {t(EAT.priceCheckedOn, locale)} <Timestamp value={checkedOn} locale={locale} />
    </p>
  );
}
