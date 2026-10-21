import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CanteenDish, CanteenStall } from "@/lib/sanity/types";
import { DietTags } from "./DietTag";
import { FavouriteToggle } from "./FavouriteToggle";
import { PriceTag } from "./PriceTag";
import { SpiceMeter } from "./SpiceMeter";
import { dishDietTags } from "./diet";
import { DishTypeIcon, PinIcon } from "./icons";
import { TYPE_TAG_LABEL } from "./labels";
import { dishHref, stallHref } from "./links";
import { eat } from "./strings";

interface DishCardProps {
  dish: CanteenDish;
  /** The stall the dish is sold at. Join it with `stallOf(data, dish)`. */
  stall: CanteenStall | undefined;
  locale: Locale;
  /** The current filters, carried into the links so they survive the click. */
  filters: CanteenFilters;
  /** The outline depth of the card's heading. Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Show the favourite toggle (a client island that only appears when the device can keep data). Defaults to true. */
  showFavourite?: boolean;
  className?: string;
}

/**
 * One dish: name in both languages (the reader's own first), the surveyed
 * price with its date, which stall, diet tags and spice. A server component:
 * everything works without JavaScript except the favourite toggle, which is
 * the only client island and simply is not there until JavaScript runs.
 */
export function DishCard({ dish, stall, locale, filters, headingLevel = 3, showFavourite = true, className }: DishCardProps) {
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);
  const stallName = stall ? pick(stall.name, locale) : "";
  const showSpice = dish.type !== "drink" && dish.type !== "dessert";

  return (
    <article className={cx("flex h-full flex-col gap-[var(--space-3)] rounded-panel border border-line bg-surface p-[var(--space-4)]", className)}>
      <div className="flex items-center justify-between gap-[var(--space-2)] text-sm text-ink-600">
        <span className="inline-flex items-center gap-[var(--space-1)]">
          <DishTypeIcon type={dish.type} />
          {TYPE_TAG_LABEL[dish.type][locale]}
        </span>
        {showFavourite ? <FavouriteToggle slug={dish.slug.current} name={name} locale={locale} /> : null}
      </div>

      <div className="flex flex-col">
        <Heading level={headingLevel} visualLevel={4} className="m-0 leading-tight">
          <Link href={dishHref(locale, dish.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center text-ink-900 no-underline hover:text-action hover:underline">
            {name}
          </Link>
        </Heading>
        {otherName && otherName !== name ? (
          <p lang={other} className="pointer-events-none -mt-[var(--space-1)] text-sm text-ink-600">
            {otherName}
          </p>
        ) : null}
      </div>

      <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={locale} />

      {stall ? (
        <p className="-my-[var(--space-1)] flex items-start gap-[var(--space-1)] text-sm">
          <PinIcon className="mt-[2px] shrink-0 text-ink-600" />
          <Link href={stallHref(locale, stall.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center">{eat.stallFull(locale, stall.number, stallName)}</Link>
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-[var(--space-2)]">
        <DietTags tags={dishDietTags(dish, stall)} locale={locale} />
        {showSpice ? <SpiceMeter level={dish.spice} locale={locale} /> : null}
      </div>
    </article>
  );
}
