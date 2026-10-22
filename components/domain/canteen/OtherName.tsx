import { cx } from "@/components/ui/cx";
import { OTHER_LOCALE, pick, type Locale, type LocaleString } from "@/lib/i18n/config";

interface OtherNameProps {
  /** The dish, stall add-on or option label, with both languages. */
  name: LocaleString | undefined;
  /** The language the page is in. The line shows the other one. */
  locale: Locale;
  className?: string;
}

/**
 * The menu item's name in the language the page is not in, as a small second
 * line marked with its own `lang`. Students read the Thai to find the dish on
 * the board or to point at it; Thai readers get the English the same way.
 * Renders nothing when the two names are the same.
 */
export function OtherName({ name, locale, className }: OtherNameProps) {
  const other = OTHER_LOCALE[locale];
  const shown = pick(name, locale);
  const otherName = pick(name, other);
  if (!otherName || otherName === shown) return null;
  return (
    <span lang={other} className={cx("block text-sm text-ink-600", className)}>
      {otherName}
    </span>
  );
}
