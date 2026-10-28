import Link from "next/link";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import { canonicalOf, commonCheckedOn, stallOf } from "@/lib/canteen/derive";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish } from "@/lib/content/types";
import { CanonicalCompare } from "./CanonicalCompare";
import { CheckedOnNote } from "./CheckedOnNote";
import { DishCard } from "./DishCard";
import { FocusOnHash } from "./FocusOnHash";
import type { DishGroup } from "@/lib/canteen/filter";
import type { PagedGroup } from "./paginate";
import { stallHref } from "./links";
import { EAT, eat, t } from "./strings";

interface DishResultsProps {
  data: CanteenData;
  locale: Locale;
  filters: CanteenFilters;
  /** From `showGroups`: the first dishes of the list, from position 1. One group keyed "all" when not grouped. */
  groups: PagedGroup[];
  /** The whole, unsliced list. A price comparison reads its stall count and cheapest from here, so "show more" does not change them. Defaults to `groups`. */
  allGroups?: readonly DishGroup[];
  /** The outline depth for group headings. Dish cards sit one level below. Defaults to 3. */
  headingLevel?: HeadingLevel;
}

/** Whether a group is shown as a price comparison rather than as cards. Those have no card ids. */
function isCompareGroup(data: CanteenData, filters: CanteenFilters, group: DishGroup): boolean {
  return filters.group === "canonical" && group.dishes[0] !== undefined && canonicalOf(data, group.dishes[0]) !== undefined;
}

/**
 * The 1 based position whose id the "show more" link should end in: the
 * first dish it adds, or, when that dish sits in a price comparison (which
 * has no card of its own), the comparison's id, which is its first dish.
 * `groups` is the whole, unsliced list.
 */
export function showMoreTarget(data: CanteenData, filters: CanteenFilters, groups: readonly DishGroup[], next: number): number {
  let start = 0;
  for (const group of groups) {
    if (next <= start + group.dishes.length) return isCompareGroup(data, filters, group) ? start + 1 : next;
    start += group.dishes.length;
  }
  return next;
}

/** A dish list as a grid of cards. Each item has an id from its position in the whole list, so a link can land on it. */
function DishGrid({ data, locale, filters, dishes, headingLevel, checkedOn, first }: { data: CanteenData; locale: Locale; filters: CanteenFilters; dishes: CanteenDish[]; headingLevel: HeadingLevel; checkedOn: string | undefined; first: number }) {
  return (
    <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
      {dishes.map((dish, position) => (
        <li key={dish._id} id={eat.itemId(first + position)} tabIndex={-1} className="min-w-0 outline-none scroll-mt-[calc(var(--header-height,4rem)+9rem)]">
          <DishCard dish={dish} stall={stallOf(data, dish)} locale={locale} filters={filters} headingLevel={headingLevel} hideChecked={dish.checkedOn === checkedOn} />
        </li>
      ))}
    </Grid>
  );
}

/**
 * The results of the dish list, in whichever grouping the filters ask for.
 * Not grouped: one grid. By stall: a section per stall in walking order.
 * By dish: a section per canonical dish with the price at each stall and the
 * cheapest marked, then the dishes with no canonical dish as plain cards.
 */
export function DishResults({ data, locale, filters, groups, allGroups, headingLevel = 3 }: DishResultsProps) {
  const cardLevel = Math.min(6, headingLevel + 1) as HeadingLevel;
  const cardDishes = groups
    .filter((group) => filters.group !== "canonical" || !group.dishes[0] || !canonicalOf(data, group.dishes[0]))
    .flatMap((group) => group.dishes);
  const checkedOn = commonCheckedOn(cardDishes);
  const note = checkedOn ? <CheckedOnNote checkedOn={checkedOn} locale={locale} /> : null;
  const firsts = groups.map((_, index) => groups.slice(0, index).reduce((sum, group) => sum + group.dishes.length, 0) + 1);

  if (filters.group === "none") {
    const dishes = groups.flatMap((group) => group.dishes);
    return (
      <div className="flex flex-col gap-[var(--space-3)]">
        <FocusOnHash />
        {note}
        <DishGrid data={data} locale={locale} filters={filters} dishes={dishes} headingLevel={headingLevel} checkedOn={checkedOn} first={1} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      <FocusOnHash />
      {note}
      {groups.map((group, groupIndex) => {
        const first = firsts[groupIndex] ?? 1;
        if (filters.group === "stall") {
          const stall = group.stall;
          return (
            <section key={`${group.key}-${group.continued}`} className="flex flex-col gap-[var(--space-3)]">
              <Heading level={headingLevel} visualLevel={3} className="m-0">
                {stall ? (
                  <Link href={stallHref(locale, stall.slug.current, filters)}>{eat.stallFull(locale, stall.number, pick(stall.name, locale))}</Link>
                ) : (
                  t(EAT.stallThing, locale)
                )}
              </Heading>
              <DishGrid data={data} locale={locale} filters={filters} dishes={group.dishes} headingLevel={cardLevel} checkedOn={checkedOn} first={first} />
            </section>
          );
        }

        // By canonical dish.
        const canonical = group.dishes[0] ? canonicalOf(data, group.dishes[0]) : undefined;
        if (!canonical) {
          return (
            <section key={group.key} className="flex flex-col gap-[var(--space-3)]">
              <Heading level={headingLevel} visualLevel={3} className="m-0">
                {t(EAT.otherDishes, locale)}
              </Heading>
              <DishGrid data={data} locale={locale} filters={filters} dishes={group.dishes} headingLevel={cardLevel} checkedOn={checkedOn} first={first} />
            </section>
          );
        }
        const whole = allGroups?.find((candidate) => candidate.key === group.key) ?? group;
        const byPrice = [...whole.dishes].sort((a, b) => a.price - b.price);
        const stallCount = new Set(byPrice.map((dish) => dish.stallId)).size;
        return (
          <section key={`${group.key}-${group.continued}`} id={eat.itemId(first)} tabIndex={-1} className="flex outline-none scroll-mt-[calc(var(--header-height,4rem)+9rem)] flex-col gap-[var(--space-3)]">
            <Heading level={headingLevel} visualLevel={3} className="m-0">
              {pick(canonical.name, locale)}
              <span className="text-sm font-normal text-ink-600"> · {eat.atStalls(locale, stallCount)}</span>
            </Heading>
            <CanonicalCompare data={data} dishes={byPrice} locale={locale} filters={filters} limit={group.dishes.length} />
          </section>
        );
      })}
    </div>
  );
}
