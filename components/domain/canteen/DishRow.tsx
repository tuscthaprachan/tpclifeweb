import Link from "next/link";
import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CanteenDish, CanteenStall } from "@/lib/sanity/types";
import { DietTags } from "./DietTag";
import { HowToSay } from "./HowToSay";
import { dishDietTags } from "./diet";
import { dishHref } from "./links";
import { EAT, eat, t } from "./strings";

interface DishRowProps {
  dish: CanteenDish;
  stall: CanteenStall | undefined;
  locale: Locale;
  filters: CanteenFilters;
  className?: string;
}

/**
 * One line of a stall's menu: the name in both languages, how to order it,
 * diet tags and the price. A plain list row rather than a card, for long
 * menus where the stall is already known, so the stall's own halal badge is
 * not repeated on every row. The dish page holds the rest.
 */
export function DishRow({ dish, stall, locale, filters, className }: DishRowProps) {
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);
  const hasExtras = (dish.variants ?? []).length > 0;

  return (
    <div className={cx("flex items-start justify-between gap-[var(--space-4)] py-[var(--space-3)]", className)}>
      <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
        <Link href={dishHref(locale, dish.slug.current, filters)} className="text-lg font-semibold text-ink-900 no-underline hover:text-action hover:underline">
          {name}
        </Link>
        {otherName && otherName !== name ? (
          <p lang={other} className="m-0 text-sm text-ink-600">
            {otherName}
          </p>
        ) : null}
        <HowToSay dish={dish} locale={locale} />
        <DietTags tags={dishDietTags(dish, stall).filter((tag) => tag.key !== "halal")} locale={locale} />
      </div>
      <p className="m-0 shrink-0 text-right">
        <span className="block font-semibold text-ink-900">{eat.baht(locale, dish.price)}</span>
        {hasExtras ? <span className="block text-sm text-ink-600">{t(EAT.extrasFrom, locale)}</span> : null}
      </p>
    </div>
  );
}
