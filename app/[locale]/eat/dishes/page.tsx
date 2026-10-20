/**
 * Every dish, filterable. This is where the filters live: a real GET form
 * (column on desktop, Dialog on phones, a copy inside <noscript>), counts on
 * every option, grouping by stall or by dish with a price comparison,
 * sorting, pagination at 48, and, when nothing matches, the best ways to get
 * dishes back. Server rendered end to end, so it works without JavaScript.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DISH_PAGE_SIZE,
  DishResults,
  EAT,
  EatFilteredLayout,
  EatTabs,
  RelaxSuggestions,
  ResultCount,
  eat,
  eatHref,
  paginateGroups,
  parsePage,
  readFilters,
  redirectToTidyQuery,
  t,
} from "@/components/domain/canteen";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, InsetText, Pagination, Stack } from "@/components/ui";
import { applyFilters, countStalls, facetCounts, groupDishes, relaxSuggestions } from "@/lib/canteen/filter";
import { indexCanteen } from "@/lib/canteen/derive";
import { countActiveValues } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

const ROUTE = "/eat/dishes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, ROUTE),
    title: t(EAT.dishesTitle, locale),
    description: t(EAT.dishesIntro, locale),
  };
}

export default async function EatDishesPage({
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
  const page = parsePage(query.page);
  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: t(EAT.dishesTitle, locale) },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1}>{t(EAT.dishesTitle, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.dishesIntro, locale)}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="py-8">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  const matched = applyFilters(data, filters, now, { locale });
  const counts = facetCounts(data, filters, now);
  const paged = paginateGroups(groupDishes(data, matched, filters.group), page, DISH_PAGE_SIZE);
  const stallName = (slug: string) => {
    const stall = indexCanteen(data).stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  return (
    <Container className="py-8">
      {breadcrumbs}
      <Stack space={6}>
        {header}
        <EatTabs locale={locale} current="dishes" filters={filters} />

        <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE}>
          <Stack space={6}>
            <ResultCount locale={locale} dishes={matched.length} stalls={countStalls(data, matched)} />

            {matched.length === 0 ? (
              <Stack space={6}>
                <EmptyState title={t(EAT.noResultsTitle, locale)} />
                {countActiveValues(filters) > 0 ? (
                  <RelaxSuggestions
                    locale={locale}
                    route={ROUTE}
                    headingLevel={2}
                    stallName={stallName}
                    suggestions={relaxSuggestions(data, filters, now)}
                  />
                ) : null}
              </Stack>
            ) : (
              <Stack space={6}>
                <DishResults data={data} locale={locale} filters={filters} groups={paged.groups} headingLevel={2} />
                <Stack space={2}>
                  {paged.totalPages > 1 ? <p className="m-0 text-sm text-ink-600">{eat.showingRange(locale, paged.from, paged.to, paged.total)}</p> : null}
                  <Pagination
                    currentPage={paged.page}
                    totalPages={paged.totalPages}
                    locale={locale}
                    buildHref={(target) => eatHref(locale, ROUTE, filters, { page: target > 1 ? target : undefined })}
                  />
                </Stack>
              </Stack>
            )}

            <InsetText>
              <p className="m-0 text-sm text-ink-900">{t(EAT.surveyNote, locale)}</p>
              <p className="m-0 mt-[var(--space-2)] text-sm text-ink-900">{t(EAT.dietNote, locale)}</p>
            </InsetText>
          </Stack>
        </EatFilteredLayout>
      </Stack>
    </Container>
  );
}
