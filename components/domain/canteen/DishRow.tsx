import Link from "next/link";
import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CanteenDish, CanteenStall } from "@/lib/content/types";
import { TickIcon } from "./icons";
import { DietTags } from "./DietTag";
import { HowToSay } from "./HowToSay";
import { dishDietTags } from "./diet";
import { dishHref } from "./links";
import { priceText } from "./PriceTag";
import { EAT, t } from "./strings";

interface DishRowProps {
  dish: CanteenDish;
  stall: CanteenStall | undefined;
  locale: Locale;
  filters: CanteenFilters;
  /** With filters on: whether this dish passes them. Left out when no filter is on, so no row is marked or dimmed. */
  matches?: boolean;
  className?: string;
}

/**
 * One line of a stall's menu: the name in both languages, how to order it,
 * diet tags and the price. With filters on, a matching row carries a
 * "Matches" tag (text and a tick, not colour) and the rest are set in a
 * quieter ink that still passes 4.5:1. A plain list row rather than a card, for long
 * menus where the stall is already known, so the stall's own halal badge is
 * not repeated on every row. The dish page holds the rest.
 */
export function DishRow({ dish, stall, locale, filters, matches, className }: DishRowProps) {
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);

  return (
    <div className={cx("relative flex flex-wrap items-start justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)] py-[var(--space-3)] [&_button]:relative [&_button]:z-10", className)}>
      <div className="flex flex-1 flex-col gap-[var(--space-1)] [overflow-wrap:break-word]">
        <Link href={dishHref(locale, dish.slug.current, filters)} className={cx("inline-flex min-h-[var(--target-min)] items-center text-lg font-semibold no-underline after:absolute after:inset-0 after:content-[''] hover:text-action hover:underline", matches === false ? "text-ink-600" : "text-ink-900")}>
          {name}
        </Link>
        {otherName && otherName !== name ? (
          <p lang={other} className="m-0 text-sm text-ink-600">
            {otherName}
          </p>
        ) : null}
        {matches ? (
          <p className="m-0 inline-flex w-fit items-center gap-[var(--space-1)] text-sm font-medium text-ink-900">
            <TickIcon />
            {t(EAT.matchesTag, locale)}
          </p>
        ) : null}
        <HowToSay dish={dish} locale={locale} />
        <DietTags tags={dishDietTags(dish, stall).filter((tag) => tag.key !== "halal")} locale={locale} />
      </div>
      <p className={cx("m-0 ml-auto shrink-0 text-right font-semibold", matches === false ? "text-ink-600" : "text-ink-900")}>{priceText(locale, dish.price, dish.variants)}</p>
    </div>
  );
}
