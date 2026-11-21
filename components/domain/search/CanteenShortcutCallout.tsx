import { TYPE_LABEL } from "@/components/domain/canteen/labels";
import { SEARCH_TEXT } from "./strings";
import { Link } from "@/components/ui";
import { canteenShortcutHref, parseCanteenShortcut } from "@/lib/search/canteenShortcut";
import { formatNumber } from "@/lib/i18n/format";
import { fillText } from "@/lib/i18n/editable";
import type { Locale } from "@/lib/i18n/config";

/**
 * The "50 baht noodles" shortcut: shown above the results when the query is a
 * number followed by baht (or บาท), optionally with a dish type word. It
 * links to the canteen dishes filtered by that budget. Renders nothing for
 * any other query, and works without JavaScript (a plain link).
 */
export function CanteenShortcutCallout({ query, locale }: { query: string; locale: Locale }) {
  const shortcut = parseCanteenShortcut(query);
  if (!shortcut) return null;

  const max = formatNumber(shortcut.max, locale);
  const joined = shortcut.types.map((type) => TYPE_LABEL[type][locale]).join(SEARCH_TEXT.shortcutTypesJoin[locale]);
  const types = joined ? fillText(SEARCH_TEXT.shortcutTypes[locale], { types: joined }) : "";
  const text = fillText(SEARCH_TEXT.shortcutLink[locale], { max, types });
  const note = SEARCH_TEXT.shortcutNote[locale];

  return (
    <aside aria-label={SEARCH_TEXT.shortcutLabel[locale]} className="border-y border-line py-[var(--space-3)]">
      <p className="m-0 font-bold text-ink-900">
        <Link href={canteenShortcutHref(locale, shortcut)} locale={locale} className="inline-flex min-h-[var(--target-min)] items-center">
          {text}
        </Link>
      </p>
      <p className="m-0 text-sm text-ink-600">{note}</p>
    </aside>
  );
}
