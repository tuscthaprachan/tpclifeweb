/**
 * Every stall, in stall number order (which follows the hall). Shares the filters with the
 * dish list: with filters on, each card says how many of its dishes match and
 * the price range covers just those, and stalls with none are shown plainly
 * as having none rather than hidden.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  EAT,
  EatFilteredLayout,
  EatTabs,
  StallCard,
  eat,
  readFilters,
  redirectToTidyQuery,
  t,
} from "@/components/domain/canteen";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Grid, Heading, Stack } from "@/components/ui";
import { indexCanteen, priceRange } from "@/lib/canteen/derive";
import { facetCounts, matchesFilters } from "@/lib/canteen/filter";
import { countActiveValues } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

const ROUTE = "/eat/stalls";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, ROUTE),
    title: t(EAT.stallsTitle, locale),
    description: t(EAT.stallsIntro, locale),
  };
}

export default async function EatStallsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  redirectToTidyQuery(localePath(locale, ROUTE), query);
  const filters = readFilters(query);
  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: t(EAT.stallsTitle, locale) },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{t(EAT.stallsTitle, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.stallsIntro, locale)}</p>
    </Stack>
  );

  if (data.stalls.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  const index = indexCanteen(data);
  const filtered = countActiveValues(filters) > 0;
  const counts = facetCounts(data, filters, now);
  const rows = index.stallsInWalkOrder.map((stall) => {
    const dishes = data.dishes.filter((dish) => dish.stallId === stall._id);
    const matching = filtered ? dishes.filter((dish) => matchesFilters(data, dish, filters, now)) : dishes;
    return { stall, dishCount: dishes.length, matchCount: filtered ? matching.length : undefined, range: priceRange(matching) };
  });
  const withMatches = rows.filter((row) => row.matchCount === undefined || row.matchCount > 0).length;

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={4}>
        {header}
        <EatTabs locale={locale} current="stalls" filters={filters} />

        <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} display="none">
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
      </Stack>
    </Container>
  );
}
