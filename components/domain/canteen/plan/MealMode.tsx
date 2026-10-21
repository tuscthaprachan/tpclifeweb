/**
 * Meal for my budget: "I have 60 baht". A main plus an optional drink and an
 * optional dessert that together fit the budget, honouring every other
 * filter, best use of money first, with the stalls to walk to on a small map.
 *
 * The budget is the shared `max` parameter, so the filter column and the
 * quick form here never disagree. `same=1` keeps drink and dessert at the
 * main's stall. Server rendered end to end: it works with JavaScript off.
 */

import Link from "next/link";

import {
  EAT,
  EatFilteredLayout,
  RelaxSuggestions,
  eatHref,
  readFilters,
  redirectToTidyQuery,
  t,
} from "@/components/domain/canteen";
import { ComboCard } from "@/components/domain/canteen/budget/ComboCard";
import { MealForm } from "@/components/domain/canteen/budget/MealForm";
import { BUDGET, budget } from "@/components/domain/canteen/budget/strings";
import { Button, EmptyState, Heading, Stack } from "@/components/ui";
import { mealCombos } from "@/lib/canteen/combos";
import { effectivePrice, indexCanteen } from "@/lib/canteen/derive";
import { facetCounts, matchesFilters, relaxSuggestions } from "@/lib/canteen/filter";
import { MAX_BUDGET } from "@/lib/canteen/params";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { getCanteenData } from "@/lib/sanity/queries";

import { PLAN_ROUTE } from "./mode";

const ROUTE = PLAN_ROUTE;
/** Meals shown. The list is already ordered best first. */
const SHOWN = 12;

export async function MealMode({
  locale,
  query,
}: {
  locale: Locale;
  query: Record<string, string | string[] | undefined>;
}) {
  redirectToTidyQuery(localePath(locale, ROUTE), query);
  const filters = readFilters(query);
  const sameValue = Array.isArray(query.same) ? query.same[0] : query.same;
  const sameStall = sameValue === "1";
  const data = await getCanteenData();
  const now = new Date();

  if (data.dishes.length === 0) {
    return <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>;
  }

  const index = indexCanteen(data);
  const stallName = (slug: string) => {
    const stall = index.stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };
  const counts = facetCounts(data, filters, now);
  const carry: Record<string, string> = sameStall ? { same: "1" } : {};
  const amount = filters.max;
  const sameExtra = sameStall ? { same: 1 } : {};

  let results: React.ReactNode;
  if (amount === undefined) {
    results = (
      <EmptyState title={t(BUDGET.mealPromptTitle, locale)}>{t(BUDGET.mealPromptBody, locale)}</EmptyState>
    );
  } else {
    const combos = mealCombos(data, filters, amount, { sameStallOnly: sameStall, now, limit: SHOWN });

    if (combos.length === 0) {
      // Why nothing fits: the cheapest main that passes the filters, and the smallest raise that works.
      const mains = data.dishes
        .filter((dish) => dish.course === "main" && matchesFilters(data, dish, { ...filters, max: undefined }, now))
        .map((dish) => effectivePrice(dish, filters.variants));
      const cheapest = mains.length > 0 ? Math.min(...mains) : undefined;
      let raiseTo: number | undefined;
      for (let step = 5; step <= 100 && amount + step <= MAX_BUDGET; step += 5) {
        if (mealCombos(data, filters, amount + step, { sameStallOnly: sameStall, now, limit: 1 }).length > 0) {
          raiseTo = amount + step;
          break;
        }
      }
      const others = relaxSuggestions(data, filters, now).filter((suggestion) => suggestion.param !== "max");
      results = (
        <Stack space={6}>
          <EmptyState title={t(BUDGET.mealZeroTitle, locale)}>
            {cheapest !== undefined ? `${budget.cheapestMain(locale, cheapest)} ` : ""}
            {t(BUDGET.mealZeroBody, locale)}
          </EmptyState>
          <section aria-labelledby="meal-relax-title" className="flex flex-col gap-[var(--space-3)]">
            <Heading level={2} id="meal-relax-title" className="m-0 text-xl">
              {t(EAT.relaxTitle, locale)}
            </Heading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
              {raiseTo !== undefined ? (
                <li>
                  <Link
                    href={eatHref(locale, ROUTE, { ...filters, max: raiseTo }, sameExtra)}
                    className="inline-flex min-h-[var(--target-min)] items-center font-medium"
                  >
                    {budget.raiseTo(locale, raiseTo)}
                  </Link>
                </li>
              ) : null}
              {sameStall ? (
                <li>
                  <Link href={eatHref(locale, ROUTE, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                    {t(BUDGET.allowAnyStall, locale)}
                  </Link>
                </li>
              ) : null}
            </ul>
            <RelaxSuggestions locale={locale} route={ROUTE} headingLevel={3} stallName={stallName} suggestions={others} />
          </section>
        </Stack>
      );
    } else {
      results = (
        <Stack space={6}>
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-4)]">
            <Stack space={1}>
              <Heading level={2} className="m-0 text-xl">
                {budget.mealsFor(locale, amount)}
              </Heading>
              <p className="m-0 text-ink-600">
                {combos.length >= SHOWN ? budget.mealsShown(locale, combos.length) : budget.mealsFound(locale, combos.length)}. {t(BUDGET.mealLimitNote, locale)}
              </p>
            </Stack>
            <Button variant="secondary" href={eatHref(locale, "/eat/pick", filters, { mode: "meal", ...sameExtra })}>
              {t(BUDGET.randomCombo, locale)}
            </Button>
          </div>
          <ol className="m-0 grid list-none gap-[var(--space-4)] p-0 lg:grid-cols-2">
            {combos.map((combo, position) => (
              <li key={combo.items.map((dish) => dish.slug.current).join("|")} className="min-w-0">
                <ComboCard combo={combo} data={data} locale={locale} filters={filters} position={position + 1} headingLevel={3} />
              </li>
            ))}
          </ol>
        </Stack>
      );
    }
  }

  return (
    <Stack space={6}>
      <MealForm locale={locale} filters={filters} sameStall={sameStall} />
      <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} display="none" carry={carry}>
        <Stack space={6}>
          {results}
        </Stack>
      </EatFilteredLayout>
    </Stack>
  );
}
