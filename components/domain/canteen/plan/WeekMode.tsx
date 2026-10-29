/**
 * Plan my week: one lunch per day on campus, no stall twice, no canonical
 * dish twice, the total inside a weekly budget, every filter respected.
 *
 * Everything is in the URL, so a plan is shareable and reopens the same:
 *   budget, days, seed, lock.<weekday>, keep.<weekday> (see week-params.ts)
 * With a budget but no seed the request is sent on to the same URL plus a
 * fresh seed (see `planTarget`). Lock, unlock and reroll are plain links;
 * JavaScript adds only "Save this week to my device" and a print button.
 */

import Link from "next/link";

import { EAT, EatFilteredLayout, eatHref, readFilters, t, type Bilingual } from "@/components/domain/canteen";
import { SaveWeekButton } from "@/components/domain/canteen/budget/SaveWeekButton";
import { SpendThisWeek } from "@/components/domain/canteen/budget/SpendThisWeek";
import { WeekForm } from "@/components/domain/canteen/budget/WeekForm";
import { WeekPlanner } from "@/components/domain/canteen/budget/WeekPlanner";
import { UI } from "@/lib/i18n/strings";
import { BUDGET, budget } from "@/components/domain/canteen/budget/strings";
import { MAX_WEEK_BUDGET, allPins, clearPins, invalidWeekBudget, parseWeekRequest, weekHref, weekQuery, type WeekRequest } from "@/components/domain/canteen/budget/week-params";
import { EmptyState, Heading, Stack, WarningText } from "@/components/ui";
import { facetCounts } from "@/lib/canteen/filter";
import { countActiveValues, defaultFilters, type CanteenFilters, type RawParams } from "@/lib/canteen/params";
import { planWeek, type WeekFailure, type WeekResult } from "@/lib/canteen/week";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { PLAN_ROUTE } from "./mode";

const ROUTE = PLAN_ROUTE;

const FAILURE_TEXT: Record<WeekFailure, Bilingual> = {
  noDays: BUDGET.failNoDays,
  badDays: BUDGET.failBadDays,
  unknownLock: BUDGET.failUnknownLock,
  lockConflict: BUDGET.failLockConflict,
  notEnoughStalls: BUDGET.failNotEnoughStalls,
  budgetTooLow: BUDGET.failBudgetTooLow,
  noPlan: BUDGET.failNoPlan,
};

export function WeekMode({
  locale,
  data,
  query,
  now,
}: {
  locale: Locale;
  data: CanteenData;
  query: RawParams;
  now: Date;
}) {
  const filters = readFilters(query, data);
  const request = parseWeekRequest(query);
  const path = localePath(locale, ROUTE);

  if (data.dishes.length === 0) {
    return <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>;
  }

  const counts = facetCounts(data, filters, now);
  const attempt = (overrides: Partial<{ budget: number; days: number[] }>): WeekResult =>
    planWeek(data, filters, {
      budget: overrides.budget ?? request.budget ?? 0,
      days: overrides.days ?? request.days,
      seed: request.seed ?? "",
      locks: allPins(request),
      skips: request.skips,
      now,
    });

  const result: WeekResult | null =
    request.budget !== undefined
      ? request.days.length === 0
        ? { ok: false, reason: "noDays" }
        : attempt({})
      : null;

  let body: React.ReactNode;
  if (result === null) {
    body = <EmptyState title={t(BUDGET.weekPromptTitle, locale)}>{t(BUDGET.weekPromptBody, locale)}</EmptyState>;
  } else if (!result.ok) {
    body = (
      <FailureBlock
        locale={locale}
        reason={result.reason}
        request={request}
        path={path}
        filters={filters}
        suggestions={suggestionsFor(result.reason, request, attempt)}
      />
    );
  } else {
    body = (
      <Stack space={6}>
        <WeekPlanner locale={locale} plan={result} request={request} filters={filters} path={path} />
        <SaveWeekButton
          locale={locale}
          seed={request.seed ?? ""}
          budget={request.budget ?? 0}
          days={result.days.map((day) => ({ weekday: day.weekday, slug: day.dish.slug.current, price: day.price }))}
        />
        <p className="no-print m-0 text-sm text-ink-600">{t(BUDGET.shareNote, locale)}</p>
      </Stack>
    );
  }

  // What the filter form does not own: the budget, days, seed and pins, so changing a filter keeps the plan's settings.
  const carry = Object.fromEntries(new URLSearchParams(weekQuery(request, defaultFilters())).entries());

  return (
    <Stack space={6}>
      <WeekForm key={`${weekQuery(request, filters)}|${invalidWeekBudget(query) ?? ""}`} locale={locale} request={request} filters={filters} invalid={invalidWeekBudget(query)} />
      <div className="no-print">
        <SpendThisWeek locale={locale} explain={false} />
        <p className="m-0 mt-[var(--space-2)] text-base">
          <Link href={localePath(locale, "/eat/mine")}>{t(BUDGET.mineTitle, locale)}</Link>
        </p>
      </div>
      <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} display="none" carry={carry}>
        <Stack space={6}>
          {body}
        </Stack>
      </EatFilteredLayout>
    </Stack>
  );
}

interface Suggestion {
  key: string;
  kind: "raise" | "fewer" | "unlock";
  value?: number;
}

/** The smallest budget above `from`, in steps of 5 baht, for which `works` is true; undefined if none up to the most a week may cost. Assumes a dearer budget never does worse. */
function smallestWorkingBudget(from: number, works: (budget: number) => boolean): number | undefined {
  const next = (amount: number) => Math.min(MAX_WEEK_BUDGET, amount);
  let low = from;
  let high = next(from + 5);
  while (!works(high)) {
    if (high >= MAX_WEEK_BUDGET) return undefined;
    low = high;
    high = next(high + (high - from) * 2);
  }
  while (high - low > 5) {
    const middle = low + Math.ceil((high - low) / 10) * 5;
    if (works(middle)) high = middle;
    else low = middle;
  }
  return high;
}

/** Concrete next steps for a failure: a budget that works, fewer days, or fewer pins. Computed, never guessed. */
function suggestionsFor(reason: WeekFailure, request: WeekRequest, attempt: (o: Partial<{ budget: number; days: number[] }>) => WeekResult): Suggestion[] {
  const out: Suggestion[] = [];
  const budgetNow = request.budget ?? 0;
  if (reason === "budgetTooLow" || reason === "noPlan") {
    const raised = smallestWorkingBudget(budgetNow, (amount) => attempt({ budget: amount }).ok);
    if (raised !== undefined) out.push({ key: "raise", kind: "raise", value: raised });
  }
  if (reason === "notEnoughStalls" || reason === "budgetTooLow" || reason === "noPlan") {
    for (let days = request.days.length - 1; days >= 1; days -= 1) {
      const fewer = request.days.slice(0, days);
      if (attempt({ days: fewer }).ok) {
        out.push({ key: "fewer", kind: "fewer", value: days });
        break;
      }
    }
  }
  if (reason === "unknownLock" || reason === "lockConflict") out.push({ key: "unlock", kind: "unlock" });
  return out;
}

function FailureBlock({
  locale,
  reason,
  request,
  path,
  filters,
  suggestions,
}: {
  locale: Locale;
  reason: WeekFailure;
  request: WeekRequest;
  path: string;
  filters: CanteenFilters;
  suggestions: Suggestion[];
}) {
  return (
    <Stack space={4}>
      <WarningText>
        <span className="visually-hidden">{UI.warning[locale]}: </span>
        <strong>{t(BUDGET.failTitle, locale)}.</strong> {t(FAILURE_TEXT[reason], locale)}
      </WarningText>
      {suggestions.length > 0 || countActiveValues(filters) > 0 ? (
        <section aria-labelledby="week-suggest-title" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="week-suggest-title" className="m-0 text-xl">
            {t(BUDGET.suggestTitle, locale)}
          </Heading>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
            {suggestions.map((suggestion) => {
              if (suggestion.kind === "raise" && suggestion.value !== undefined) {
                return (
                  <li key={suggestion.key}>
                    <Link href={weekHref(path, { ...request, budget: suggestion.value }, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                      {budget.raiseTo(locale, suggestion.value)}
                    </Link>
                  </li>
                );
              }
              if (suggestion.kind === "fewer" && suggestion.value !== undefined) {
                return (
                  <li key={suggestion.key}>
                    <Link href={weekHref(path, { ...request, days: request.days.slice(0, suggestion.value) }, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                      {budget.fewerDays(locale, suggestion.value)}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={suggestion.key}>
                  <Link href={weekHref(path, clearPins(request), filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                    {t(BUDGET.unlockAll, locale)}
                  </Link>
                </li>
              );
            })}
            {countActiveValues(filters) > 0 ? (
              <li>
                <Link
                  href={eatHref(locale, ROUTE, defaultFilters(), { mode: "week", budget: request.budget, days: request.days.join(","), seed: request.seed })}
                  className="inline-flex min-h-[var(--target-min)] items-center font-medium"
                >
                  {t(EAT.clearAll, locale)}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </Stack>
  );
}
