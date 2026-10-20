import { TYPE_LABEL } from "@/components/domain/canteen/labels";
import { Link } from "@/components/ui";
import { canteenShortcutHref, parseCanteenShortcut } from "@/lib/search/canteenShortcut";
import { formatNumber } from "@/lib/i18n/format";
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
  const types = shortcut.types.map((type) => TYPE_LABEL[type][locale]).join(locale === "th" ? " และ " : " and ");
  const text =
    locale === "th"
      ? `ดูเมนูโรงอาหารราคาไม่เกิน ${max} บาท${types ? ` (${types})` : ""}`
      : `See canteen dishes under ${max} baht${types ? ` (${types})` : ""}`;
  const note =
    locale === "th"
      ? "ราคามาจากการสำรวจ ทุกราคาบอกวันที่ตรวจไว้"
      : "Prices come from our survey and show the day they were checked.";

  return (
    <aside aria-label={locale === "th" ? "ทางลัดไปโรงอาหาร" : "Canteen shortcut"} className="rounded-panel border border-line bg-welfare-soft p-[var(--space-4)]">
      <p className="m-0 font-medium text-ink-900">
        <Link href={canteenShortcutHref(locale, shortcut)} locale={locale} className="inline-flex min-h-[var(--target-min)] items-center">
          {text}
        </Link>
      </p>
      <p className="m-0 text-sm text-ink-600">{note}</p>
    </aside>
  );
}
