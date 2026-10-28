/**
 * Every dish, filterable. This is where the filters live: a real GET form
 * (column on desktop, Dialog on phones, a copy inside <noscript>), counts on
 * every option, grouping by stall or by dish with a price comparison,
 * sorting, a search box, twenty dishes at a time with a "Show more" link
 * (`?show=40` is a plain server render, so Back and no JavaScript both work)
 * and, when nothing matches, the best ways to get dishes back. Server rendered end to end, so it works without JavaScript.
 */

import type { Metadata } from "next";
import Link from "next/link";
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
  parseShow,
  readFilters,
  redirectToTidyQuery,
  showGroups,
  showMoreTarget,
  t,
} from "@/components/domain/canteen";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, EmptyState, Heading, Stack } from "@/components/ui";
import { applyFilters, countStalls, facetCounts, groupDishes, relaxSearch, relaxSuggestions } from "@/lib/canteen/filter";
import { indexCanteen } from "@/lib/canteen/derive";
import { MAX_QUERY_LENGTH, countActiveValues, serialise } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

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
  const data = await getCanteenData();
  const filters = readFilters(query, data);
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
      <Heading level={1} className="text-3xl">{t(EAT.dishesTitle, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.dishesIntro, locale)}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
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

  const matched = applyFilters(data, filters, now, { locale });
  const counts = facetCounts(data, filters, now);
  const allGroups = groupDishes(data, matched, filters.group);
  const shown = showGroups(allGroups, parseShow(query.show, query.page, matched.length, DISH_PAGE_SIZE), DISH_PAGE_SIZE);
  const relaxQuery = relaxSearch(data, filters, now);
  const hiddenFilters = [...new URLSearchParams(serialise({ ...filters, q: undefined })).entries()];
  const searchId = "dish-search";
  const loadMoreHref = `${eatHref(locale, ROUTE, filters, { show: shown.shown + shown.nextCount })}#${eat.itemId(showMoreTarget(data, filters, allGroups, shown.shown + 1))}`;
  const stallName = (slug: string) => {
    const stall = indexCanteen(data).stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={4}>
        {header}
        <EatTabs locale={locale} current="dishes" filters={filters} />

        <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} carry={filters.q !== undefined ? { q: filters.q } : undefined}>
          <Stack space={4}>
            <form method="get" action={localePath(locale, ROUTE)} role="search" aria-label={t(EAT.searchLabel, locale)} className="flex flex-col gap-[var(--space-1)]">
              {hiddenFilters.map(([name, value]) => (
                <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
              ))}
              <label htmlFor={searchId} className="text-base font-medium text-ink-900">
                {t(EAT.searchLabel, locale)}
              </label>
              <p id={`${searchId}-hint`} className="m-0 text-sm text-ink-600">
                {t(EAT.searchHint, locale)}
              </p>
              <div className="flex gap-[var(--space-2)]">
                <input
                  id={searchId}
                  type="search"
                  name="q"
                  defaultValue={filters.q}
                  enterKeyHint="search"
                  autoComplete="off"
                  maxLength={MAX_QUERY_LENGTH}
                  aria-describedby={`${searchId}-hint`}
                  className="min-h-[var(--target-min)] min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
                />
                <Button type="submit" variant="secondary">
                  {t(EAT.searchButton, locale)}
                </Button>
              </div>
              {filters.q !== undefined ? (
                <p className="m-0">
                  <Link href={eatHref(locale, ROUTE, { ...filters, q: undefined })} className="inline-flex min-h-[var(--target-min)] items-center text-sm font-medium">
                    {t(EAT.searchClear, locale)}
                  </Link>
                </p>
              ) : null}
            </form>

            <ResultCount locale={locale} dishes={matched.length} stalls={countStalls(data, matched)} />

            {matched.length === 0 ? (
              <Stack space={4}>
                <EmptyState title={filters.q !== undefined ? eat.noSearchResults(locale, filters.q) : t(EAT.noResultsTitle, locale)} />
                {countActiveValues(filters) > 0 ? (
                  <RelaxSuggestions
                    locale={locale}
                    route={ROUTE}
                    headingLevel={2}
                    stallName={stallName}
                    suggestions={relaxSuggestions(data, filters, now)}
                  />
                ) : null}
                {relaxQuery && filters.q !== undefined ? (
                  <p className="m-0">
                    <Link href={eatHref(locale, ROUTE, relaxQuery.filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                      {eat.relaxSearch(locale, filters.q, relaxQuery.count)}
                    </Link>
                  </p>
                ) : null}
              </Stack>
            ) : (
              <Stack space={4}>
                <DishResults data={data} locale={locale} filters={filters} groups={shown.groups} allGroups={allGroups} headingLevel={2} />
                <Stack space={2}>
                  <p className="m-0 text-sm text-ink-600">{eat.showingRange(locale, 1, shown.shown, shown.total)}</p>
                  {shown.nextCount > 0 ? (
                    <p className="m-0">
                      <Link
                        href={loadMoreHref}
                        className="inline-flex min-h-[var(--target-min)] items-center justify-center rounded-control border border-line-strong bg-surface px-[var(--space-4)] py-[var(--space-2)] font-medium text-ink-900 no-underline hover:bg-surface-alt"
                      >
                        {eat.showMore(locale, shown.nextCount)}
                      </Link>
                    </p>
                  ) : null}
                </Stack>
              </Stack>
            )}

          </Stack>
        </EatFilteredLayout>
      </Stack>
    </Container>
  );
}
