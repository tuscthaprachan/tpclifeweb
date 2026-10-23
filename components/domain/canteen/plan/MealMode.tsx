/**
 * Meal for my budget: "I have 60 baht". A main plus an optional drink and an
 * optional dessert that together fit the budget, honouring every other
 * filter, best use of money first, with the stalls to walk to on a small map.
 *
 * The budget for the whole meal is its own `meal` parameter. `max` stays the
 * filter column's highest price per dish and applies inside every combo, so
 * the two never get mixed up. `same=1` keeps drink and dessert at the main's
 * stall. An old link with the meal budget in `max` is redirected to `meal`. Server rendered end to end: it works with JavaScript off.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  EAT,
  EatFilteredLayout,
  RelaxSuggestions,
  eat,
  eatHref,
  readFilters,
  t,
} from "@/components/domain/canteen";
import { ComboCard } from "@/components/domain/canteen/budget/ComboCard";
import { MealForm } from "@/components/domain/canteen/budget/MealForm";
import { BUDGET, budget } from "@/components/domain/canteen/budget/strings";
import { canonicalMealQuery } from "@/components/domain/canteen/query";
import { Button, EmptyState, Heading, Stack } from "@/components/ui";
import { mealCombos } from "@/lib/canteen/combos";
import { effectivePrice, indexCanteen } from "@/lib/canteen/derive";
import { facetCounts, matchesFilters, relaxSuggestions } from "@/lib/canteen/filter";
import { MAX_BUDGET, parseMealBudget } from "@/lib/canteen/params";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { getCanteenData } from "@/lib/content";

import { PLAN_ROUTE } from "./mode";

const ROUTE = PLAN_ROUTE;
/** Meals shown at first, how many each "show more" adds, and the most the page will show. The list is already ordered best first. */
const FIRST = 6;
const STEP = 6;
const MAX_SHOWN = 24;

export async function MealMode({
  locale,
  query,
}: {
  locale: Locale;
  query: Record<string, string | string[] | undefined>;
}) {
  const canonical = canonicalMealQuery(query);
  if (canonical !== null) redirect(canonical ? `${localePath(locale, ROUTE)}?${canonical}` : localePath(locale, ROUTE));
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
  const amount = parseMealBudget(query);
  const carry: Record<string, string> = {
    ...(amount !== undefined ? { meal: String(amount) } : {}),
    ...(sameStall ? { same: "1" } : {}),
  };
  const sameExtra = sameStall ? { same: 1 } : {};

  let results: React.ReactNode;
  if (amount === undefined) {
    results = (
      <EmptyState title={t(BUDGET.mealPromptTitle, locale)}>{t(BUDGET.mealPromptBody, locale)}</EmptyState>
    );
  } else {
    const combos = mealCombos(data, filters, amount, { sameStallOnly: sameStall, now, limit: MAX_SHOWN });

    if (combos.length === 0) {
      // Why nothing fits: the cheapest main that passes the filters, and the smallest raise that works.
      const mains = data.dishes
        .filter((dish) => dish.course === "main" && matchesFilters(data, dish, filters, now))
        .map((dish) => effectivePrice(dish, filters.variants));
      const cheapest = mains.length > 0 ? Math.min(...mains) : undefined;
      let raiseTo: number | undefined;
      for (let step = 5; step <= 100 && amount + step <= MAX_BUDGET; step += 5) {
        if (mealCombos(data, filters, amount + step, { sameStallOnly: sameStall, now, limit: 1 }).length > 0) {
          raiseTo = amount + step;
          break;
        }
      }
      const others = relaxSuggestions(data, filters, now);
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
                    href={eatHref(locale, ROUTE, filters, { meal: raiseTo, ...sameExtra })}
                    className="inline-flex min-h-[var(--target-min)] items-center font-medium"
                  >
                    {budget.raiseTo(locale, raiseTo)}
                  </Link>
                </li>
              ) : null}
              {sameStall ? (
                <li>
                  <Link href={eatHref(locale, ROUTE, filters, { meal: amount })} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                    {t(BUDGET.allowAnyStall, locale)}
                  </Link>
                </li>
              ) : null}
            </ul>
            <RelaxSuggestions locale={locale} route={`${ROUTE}?meal=${amount}${sameStall ? "&same=1" : ""}`} headingLevel={3} stallName={stallName} suggestions={others} />
          </section>
        </Stack>
      );
    } else {
      const showValue = Array.isArray(query.show) ? query.show[0] : query.show;
      const requested = Number.parseInt(showValue ?? "", 10);
      const shown = Math.min(combos.length, Number.isFinite(requested) ? Math.min(MAX_SHOWN, Math.max(FIRST, requested)) : FIRST);
      const visible = combos.slice(0, shown);
      const more = shown < combos.length ? Math.min(STEP, combos.length - shown) : 0;
      results = (
        <Stack space={6}>
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-4)]">
            <Stack space={1}>
              <Heading level={2} className="m-0 text-xl">
                {budget.mealsFor(locale, amount)}
              </Heading>
              <p className="m-0 text-ink-600">
                {combos.length > shown ? budget.mealsShown(locale, shown) : budget.mealsFound(locale, combos.length)}. {t(BUDGET.mealLimitNote, locale)}
              </p>
            </Stack>
            <Button variant="secondary" href={eatHref(locale, "/eat/pick", filters, { mode: "meal", meal: amount, ...sameExtra })}>
              {t(BUDGET.randomCombo, locale)}
            </Button>
          </div>
          <ol className="m-0 grid list-none gap-[var(--space-4)] p-0 lg:grid-cols-2">
            {visible.map((combo, position) => (
              <li key={combo.items.map((dish) => dish.slug.current).join("|")} id={`meal-${position + 1}`} className="min-w-0 scroll-mt-[calc(var(--header-height,4rem)+var(--space-4))]">
                <ComboCard combo={combo} data={data} locale={locale} filters={filters} position={position + 1} headingLevel={3} />
              </li>
            ))}
          </ol>
          {more > 0 ? (
            <p className="m-0">
              <Link
                href={`${eatHref(locale, ROUTE, filters, { meal: amount, ...sameExtra, show: shown + more })}#meal-${shown + 1}`}
                className="inline-flex min-h-[var(--target-min)] items-center font-medium"
              >
                {eat.showMoreMeals(locale, more)}
              </Link>
            </p>
          ) : null}
        </Stack>
      );
    }
  }

  return (
    <Stack space={6}>
      <MealForm locale={locale} filters={filters} meal={amount} sameStall={sameStall} />
      <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} display="none" carry={carry} hide={["max"]}>
        <Stack space={6}>
          {results}
        </Stack>
      </EatFilteredLayout>
    </Stack>
  );
}
