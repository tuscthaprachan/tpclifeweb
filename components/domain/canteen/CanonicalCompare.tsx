import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { Timestamp } from "@/components/ui/Timestamp";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { stallOf } from "@/lib/canteen/derive";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish } from "@/lib/sanity/types";
import { cheapestSlugs } from "./compare";
import { CoinIcon } from "./icons";
import { dishHref } from "./links";
import { EAT, eat, t } from "./strings";

interface CanonicalCompareProps {
  data: CanteenData;
  /** Every dish of one canonical dish, cheapest first (`dishesInCanonical` gives this order). */
  dishes: readonly CanteenDish[];
  locale: Locale;
  filters: CanteenFilters;
  /** The dish the reader is looking at, shown as "This one" instead of a link. */
  currentSlug?: string;
  /** When set, shows a heading above the list at this outline depth. */
  title?: string;
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * The same dish at every stall that makes it, with the price at each.
 * The cheapest is marked with a coin, the word "Cheapest" and a filled tag
 * (1.4.1: not colour alone). Each price keeps its checked-on date. Rendered
 * as a list, not a table, so it stacks at 320 px.
 */
export function CanonicalCompare({ data, dishes, locale, filters, currentSlug, title, headingLevel = 3, className }: CanonicalCompareProps) {
  const cheapest = cheapestSlugs(dishes);
  return (
    <section className={cx("flex flex-col gap-[var(--space-3)]", className)}>
      {title ? (
        <Heading level={headingLevel} visualLevel={4} className="m-0">
          {title}
        </Heading>
      ) : null}
      <ul className="m-0 flex list-none flex-col p-0">
        {dishes.map((dish) => {
          const stall = stallOf(data, dish);
          const current = dish.slug.current === currentSlug;
          const stallLine = stall ? eat.stallFull(locale, stall.number, pick(stall.name, locale)) : "";
          return (
            <li
              key={dish.slug.current}
              className="flex flex-wrap items-start justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)] border-b border-line py-[var(--space-3)] last:border-b-0"
            >
              <div className="flex min-w-0 flex-col">
                {current ? (
                  <span className="font-medium text-ink-900">
                    {stallLine} <span className="text-ink-600">({t(EAT.thisOne, locale)})</span>
                  </span>
                ) : (
                  <Link href={dishHref(locale, dish.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                    {stallLine}
                    <span className="visually-hidden">: {pick(dish.name, locale)}</span>
                  </Link>
                )}
                <span className="text-sm text-ink-600">
                  {t(EAT.priceCheckedOn, locale)} <Timestamp value={dish.checkedOn} locale={locale} />
                </span>
              </div>
              <div className="flex items-center gap-[var(--space-2)]">
                {cheapest.has(dish.slug.current) ? (
                  <span className="inline-flex items-center gap-[var(--space-1)] rounded-pill bg-welfare px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium text-ink-on-fill">
                    <CoinIcon />
                    {t(EAT.cheapestWord, locale)}
                  </span>
                ) : null}
                <span className="text-lg font-semibold text-ink-900">{eat.baht(locale, dish.price)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
