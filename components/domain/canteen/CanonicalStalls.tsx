import Link from "next/link";
import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish } from "@/lib/content/types";
import { stallsWithDishes } from "./compare";
import { dishHref, stallHref } from "./links";
import { eat } from "./strings";

const SHOWN_PER_STALL = 3;

interface CanonicalStallsProps {
  data: CanteenData;
  /** Every dish of one canonical dish. */
  dishes: readonly CanteenDish[];
  locale: Locale;
  filters: CanteenFilters;
  /** Leave this stall out, for the page of a dish it makes. */
  excludeStallId?: string;
  className?: string;
}

/**
 * The stalls that make one canonical dish: one row per stall with its lowest
 * price and up to three of its dishes. Different dishes of the same kind are
 * not compared on price, so nothing is marked cheapest.
 */
export function CanonicalStalls({ data, dishes, locale, filters, excludeStallId, className }: CanonicalStallsProps) {
  const rows = stallsWithDishes(data, dishes, excludeStallId);
  return (
    <ul className={cx("m-0 flex list-none flex-col p-0", className)}>
      {rows.map(({ stall, dishes: stallDishes, from }) => {
        const shown = stallDishes.slice(0, SHOWN_PER_STALL);
        const more = stallDishes.length - shown.length;
        const href = stallHref(locale, stall.slug.current, filters);
        return (
          <li key={stall._id} className="flex flex-col gap-y-[var(--space-1)] border-b border-line py-[var(--space-3)] last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-4)]">
              <Link href={href} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                {eat.stallFull(locale, stall.number, pick(stall.name, locale))}
              </Link>
              <span className="font-semibold text-ink-900">{stallDishes.length > 1 ? eat.fromBaht(locale, from) : eat.baht(locale, from)}</span>
            </div>
            <ul className="m-0 flex list-none flex-col p-0 text-sm">
              {shown.map((dish) => (
                <li key={dish.slug.current}>
                  <Link href={dishHref(locale, dish.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center">
                    {pick(dish.name, locale)}
                  </Link>
                </li>
              ))}
              {more > 0 ? (
                <li>
                  <Link href={href} className="inline-flex min-h-[var(--target-min)] items-center text-ink-600">
                    {eat.moreAtStall(locale, more)}
                  </Link>
                </li>
              ) : null}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
