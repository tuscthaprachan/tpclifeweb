"use client";

import { Grid } from "@/components/ui/Grid";
import { Stack } from "@/components/ui/Stack";
import { indexCanteen, priceRange } from "@/lib/canteen/derive";
import { facetCounts, matchesFilters } from "@/lib/canteen/filter";
import { countActiveValues, type RawParams } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { EatFilteredLayout } from "../EatFilteredLayout";
import { EatTabs } from "../EatTabs";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { readFilters } from "../query";
import { tidyTarget } from "../redirects";
import { StallCard } from "../StallCard";
import { eat } from "../strings";

export const STALLS_ROUTE = "/eat/stalls";

interface StallsResultsProps {
  locale: Locale;
  data: CanteenData;
}

export function LiveStallsResults({ locale, data, server }: StallsResultsProps & { server?: ServerRender }) {
  const search = useSearch();
  const { now } = useRenderState(search.toString(), server);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, STALLS_ROUTE), search)} />
      <StallsResults locale={locale} data={data} query={search} now={now} />
    </>
  );
}

export function StallsResults({ locale, data, query, now }: StallsResultsProps & { query: RawParams; now: Date }) {
  const filters = readFilters(query);
  const index = indexCanteen(data);
  const filtered = countActiveValues(filters) > 0;
  const counts = facetCounts(data, filters, now);
  const rows = index.stallsInWalkOrder.map((stall) => {
    const dishes = data.dishes.filter((dish) => dish.stallId === stall._id);
    const matching = filtered ? dishes.filter((dish) => matchesFilters(data, dish, filters, now)) : dishes;
    return { stall, dishCount: dishes.length, matchCount: filtered ? matching.length : undefined, range: priceRange(matching, filters.max === undefined || filters.variants) };
  });
  const withMatches = rows.filter((row) => row.matchCount === undefined || row.matchCount > 0).length;

  return (
    <>
      <EatTabs locale={locale} current="stalls" filters={filters} />

      <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={STALLS_ROUTE} display="none">
        <Stack space={4}>
          <p role="status" aria-live="polite" aria-atomic="true" className="m-0 text-base font-medium text-ink-900">
            {eat.stallsShown(locale, withMatches, rows.length, filtered)}
          </p>
          <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
            {rows.map(({ stall, dishCount, matchCount, range }) => (
              <li key={stall._id} className="min-w-0">
                <StallCard
                  stall={stall}
                  locale={locale}
                  filters={filters}
                  dishCount={dishCount}
                  matchCount={matchCount}
                  priceRange={range}
                  headingLevel={2}
                />
              </li>
            ))}
          </Grid>
        </Stack>
      </EatFilteredLayout>
    </>
  );
}
