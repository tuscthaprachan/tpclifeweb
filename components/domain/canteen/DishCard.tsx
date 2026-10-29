import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CanteenDish, CanteenStall } from "@/lib/content/types";
import { DietTags } from "./DietTag";
import { FavouriteToggle } from "./FavouriteToggle";
import { HowToSay } from "./HowToSay";
import { PriceTag } from "./PriceTag";
import { dishDietTags } from "./diet";
import { DishTypeIcon } from "./icons";
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
  /** Leave out the "Price checked on" line because the list shows it once. */
  hideChecked?: boolean;
  className?: string;
}

/**
 * One dish, compact: the name and the surveyed price on one row, the other
 * language's name under it, one line with the stall and the type, then the
 * diet tags and how to say it. Plain markup: everything works without
 * JavaScript except the favourite toggle and the speaker buttons, which are
 * client islands and simply are not there until JavaScript runs.
 *
 * The whole card opens the dish. The heading link stretches over the card
 * with its `::after` (the card is not wrapped in an `<a>`, so the card keeps
 * one tab stop for it), and the stall link, favourite toggle and speaker
 * buttons sit above that layer so each stays separately clickable.
 */
export function DishCard({ dish, stall, locale, filters, headingLevel = 3, showFavourite = true, hideChecked = false, className }: DishCardProps) {
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);
  const stallName = stall ? pick(stall.name, locale) : "";
  const tags = dishDietTags(dish, stall);

  return (
    <article
      className={cx(
        "relative flex h-full flex-col gap-[var(--space-2)] rounded-panel border border-line bg-surface p-[var(--space-3)] hover:border-line-strong hover:bg-surface-alt",
        "has-[:focus-visible]:[box-shadow:0_0_0_6px_var(--focus-bar)] has-[:focus-visible]:[outline:var(--focus-width)_solid_var(--focus-fill)]",
        "[&_button]:relative [&_button]:z-10",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <div className="flex flex-1 flex-col [overflow-wrap:break-word]">
          <Heading level={headingLevel} visualLevel={3} className="m-0 leading-tight">
            <Link
              href={dishHref(locale, dish.slug.current, filters)}
              className="inline-flex min-h-[var(--target-min)] items-center text-ink-900 no-underline after:absolute after:inset-0 after:content-[''] hover:text-action hover:underline focus-visible:shadow-none focus-visible:outline-none"
            >
              {name}
            </Link>
          </Heading>
          {otherName && otherName !== name ? (
            <p lang={other} className="m-0 text-sm text-ink-600">
              {otherName}
            </p>
          ) : null}
        </div>
        <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={locale} hideChecked={hideChecked} className="ml-auto shrink-0 items-end whitespace-nowrap text-right" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-2)] text-sm text-ink-600">
        <p className="m-0 flex min-w-0 flex-wrap items-center gap-x-[var(--space-1)]">
          {stall ? (
            <>
              <Link href={stallHref(locale, stall.slug.current, filters)} className="relative z-10 inline-flex min-h-[var(--target-min)] items-center">
                {eat.stallFull(locale, stall.number, stallName)}
              </Link>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-[var(--space-1)]">
            <DishTypeIcon type={dish.type} />
            {TYPE_TAG_LABEL[dish.type][locale]}
          </span>
        </p>
        {showFavourite ? <FavouriteToggle slug={dish.slug.current} name={name} locale={locale} /> : null}
      </div>

      {tags.length > 0 ? <DietTags tags={tags} locale={locale} /> : null}
      <HowToSay dish={dish} locale={locale} />
    </article>
  );
}
