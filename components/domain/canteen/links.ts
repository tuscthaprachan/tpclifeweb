/**
 * Links inside /eat. Every one that can carry the filters goes through
 * `withFilters`, so a student who sets "no pork, under 50 baht" once keeps it
 * from the hub to the dishes, the stalls, the map and the pick.
 */

import { withFilters, type CanteenFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";

type Extra = Record<string, string | number | boolean | null | undefined>;

/** A link to any /eat route, carrying the filters. `route` is locale free, for example "/eat/pick". */
export function eatHref(locale: Locale, route: string, filters: CanteenFilters, extra?: Extra): string {
  return withFilters(localePath(locale, route), filters, extra);
}

export function dishHref(locale: Locale, slug: string, filters: CanteenFilters): string {
  return eatHref(locale, `/eat/dishes/${slug}`, filters);
}

export function stallHref(locale: Locale, slug: string, filters: CanteenFilters): string {
  return eatHref(locale, `/eat/stalls/${slug}`, filters);
}

/** The map, with one stall highlighted. The map agent's page reads `highlight`. */
export function mapHref(locale: Locale, filters: CanteenFilters, highlightStallSlug?: string): string {
  return eatHref(locale, "/eat/map", filters, { highlight: highlightStallSlug });
}
