import Link from "next/link";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import { canonicalOf, stallOf } from "@/lib/canteen/derive";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish } from "@/lib/sanity/types";
import { CanonicalCompare } from "./CanonicalCompare";
import { DishCard } from "./DishCard";
import type { PagedGroup } from "./paginate";
import { stallHref } from "./links";
import { EAT, eat, t } from "./strings";

interface DishResultsProps {
  data: CanteenData;
  locale: Locale;
  filters: CanteenFilters;
  /** From `paginateGroups`. One group keyed "all" when not grouped. */
  groups: PagedGroup[];
  /** The outline depth for group headings. Dish cards sit one level below. Defaults to 3. */
  headingLevel?: HeadingLevel;
}

/** A dish list as a grid of cards. */
function DishGrid({ data, locale, filters, dishes, headingLevel }: { data: CanteenData; locale: Locale; filters: CanteenFilters; dishes: CanteenDish[]; headingLevel: HeadingLevel }) {
  return (
    <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
      {dishes.map((dish) => (
        <li key={dish._id} className="min-w-0">
          <DishCard dish={dish} stall={stallOf(data, dish)} locale={locale} filters={filters} headingLevel={headingLevel} />
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
export function DishResults({ data, locale, filters, groups, headingLevel = 3 }: DishResultsProps) {
  const cardLevel = Math.min(6, headingLevel + 1) as HeadingLevel;

  if (filters.group === "none") {
    const dishes = groups.flatMap((group) => group.dishes);
    return <DishGrid data={data} locale={locale} filters={filters} dishes={dishes} headingLevel={headingLevel} />;
  }

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      {groups.map((group) => {
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
              <DishGrid data={data} locale={locale} filters={filters} dishes={group.dishes} headingLevel={cardLevel} />
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
              <DishGrid data={data} locale={locale} filters={filters} dishes={group.dishes} headingLevel={cardLevel} />
            </section>
          );
        }
        const byPrice = [...group.dishes].sort((a, b) => a.price - b.price);
        const stallCount = new Set(byPrice.map((dish) => dish.stall._ref)).size;
        return (
          <section key={`${group.key}-${group.continued}`} className="flex flex-col gap-[var(--space-3)]">
            <Heading level={headingLevel} visualLevel={3} className="m-0">
              {pick(canonical.name, locale)}
              <span className="text-sm font-normal text-ink-600"> · {eat.atStalls(locale, stallCount)}</span>
            </Heading>
            <CanonicalCompare data={data} dishes={byPrice} locale={locale} filters={filters} />
          </section>
        );
      })}
    </div>
  );
}
