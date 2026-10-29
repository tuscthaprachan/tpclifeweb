import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stack } from "@/components/ui/Stack";
import { indexCanteen } from "@/lib/canteen/derive";
import { applyFilters, countStalls, facetCounts, groupDishes, relaxSearch, relaxSuggestions } from "@/lib/canteen/filter";
import { MAX_QUERY_LENGTH, countActiveValues, serialise, type RawParams } from "@/lib/canteen/params";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { DishResults, showMoreTarget } from "../DishResults";
import { EatFilteredLayout } from "../EatFilteredLayout";
import { EatTabs } from "../EatTabs";
import { eatHref } from "../links";
import { DISH_PAGE_SIZE, showGroups, parseShow } from "../paginate";
import { firstParam, readFilters } from "../query";
import { RelaxSuggestions } from "../RelaxSuggestions";
import { ResultCount } from "../ResultCount";
import { EAT, eat, t } from "../strings";

export const DISHES_ROUTE = "/eat/dishes";

interface DishesResultsProps {
  locale: Locale;
  data: CanteenData;
}

export function DishesResults({ locale, data, query, now }: DishesResultsProps & { query: RawParams; now: Date }) {
  const filters = readFilters(query, data);

  const matched = applyFilters(data, filters, now, { locale });
  const counts = facetCounts(data, filters, now);
  const allGroups = groupDishes(data, matched, filters.group);
  const shown = showGroups(allGroups, parseShow(firstParam(query, "show"), firstParam(query, "page"), matched.length, DISH_PAGE_SIZE), DISH_PAGE_SIZE);
  const relaxQuery = relaxSearch(data, filters, now);
  const hiddenFilters = [...new URLSearchParams(serialise({ ...filters, q: undefined })).entries()];
  const searchId = "dish-search";
  const loadMoreHref = `${eatHref(locale, DISHES_ROUTE, filters, { show: shown.shown + shown.nextCount })}#${eat.itemId(showMoreTarget(data, filters, allGroups, shown.shown + 1))}`;
  const stallName = (slug: string) => {
    const stall = indexCanteen(data).stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  return (
    <>
      <EatTabs locale={locale} current="dishes" filters={filters} />

      <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={DISHES_ROUTE} carry={filters.q !== undefined ? { q: filters.q } : undefined}>
        <Stack space={4}>
          <Form key={filters.q ?? ""} action={localePath(locale, DISHES_ROUTE)} role="search" aria-label={t(EAT.searchLabel, locale)} className="flex flex-col gap-[var(--space-1)]">
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
                <Link href={eatHref(locale, DISHES_ROUTE, { ...filters, q: undefined })} className="inline-flex min-h-[var(--target-min)] items-center text-sm font-medium">
                  {t(EAT.searchClear, locale)}
                </Link>
              </p>
            ) : null}
          </Form>

          <ResultCount locale={locale} dishes={matched.length} stalls={countStalls(data, matched)} />

          {matched.length === 0 ? (
            <Stack space={4}>
              <EmptyState title={filters.q !== undefined ? eat.noSearchResults(locale, filters.q) : t(EAT.noResultsTitle, locale)} />
              {countActiveValues(filters) > 0 ? (
                <RelaxSuggestions
                  locale={locale}
                  route={DISHES_ROUTE}
                  headingLevel={2}
                  stallName={stallName}
                  suggestions={relaxSuggestions(data, filters, now)}
                />
              ) : null}
              {relaxQuery && filters.q !== undefined ? (
                <p className="m-0">
                  <Link href={eatHref(locale, DISHES_ROUTE, relaxQuery.filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
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
    </>
  );
}
