/**
 * Plan my week: one lunch per day on campus, no stall twice, no canonical
 * dish twice, the total inside a weekly budget, every filter respected.
 *
 * Everything is in the URL, so a plan is shareable and reopens the same:
 *   budget, days, seed, lock.<weekday>, keep.<weekday> (see week-params.ts)
 * With a budget but no seed the page redirects to the same URL plus a fresh
 * seed. Lock, unlock and reroll are plain links; JavaScript adds only "Save
 * this week to my device" and a print button.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EAT, EatFilteredLayout, eatHref, readFilters, redirectToTidyQuery, t, type Bilingual } from "@/components/domain/canteen";
import { SaveWeekButton } from "@/components/domain/canteen/budget/SaveWeekButton";
import { SpendThisWeek } from "@/components/domain/canteen/budget/SpendThisWeek";
import { WeekForm } from "@/components/domain/canteen/budget/WeekForm";
import { WeekPlanner } from "@/components/domain/canteen/budget/WeekPlanner";
import { BUDGET, budget } from "@/components/domain/canteen/budget/strings";
import { allPins, clearPins, parseWeekRequest, weekHref, weekQuery, type WeekRequest } from "@/components/domain/canteen/budget/week-params";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, InsetText, Stack, WarningText } from "@/components/ui";
import { facetCounts } from "@/lib/canteen/filter";
import { countActiveValues, defaultFilters, type CanteenFilters } from "@/lib/canteen/params";
import { newSeed } from "@/lib/canteen/random";
import { planWeek, type WeekFailure, type WeekResult } from "@/lib/canteen/week";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

const ROUTE = "/eat/week";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, ROUTE),
    title: t(BUDGET.weekTitle, locale),
    description: t(BUDGET.weekIntro, locale),
  };
}

const FAILURE_TEXT: Record<WeekFailure, Bilingual> = {
  noDays: BUDGET.failNoDays,
  badDays: BUDGET.failBadDays,
  unknownLock: BUDGET.failUnknownLock,
  lockConflict: BUDGET.failLockConflict,
  notEnoughStalls: BUDGET.failNotEnoughStalls,
  budgetTooLow: BUDGET.failBudgetTooLow,
  noPlan: BUDGET.failNoPlan,
};

export default async function EatWeekPage({
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
  const request = parseWeekRequest(query);
  const path = localePath(locale, ROUTE);

  // A plan needs a seed to be shareable. Give it one and send the reader to the permanent link.
  if (request.budget !== undefined && request.days.length > 0 && !request.seed) {
    redirect(weekHref(path, { ...request, seed: newSeed() }, filters));
  }

  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: t(BUDGET.weekTitle, locale) },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1}>{t(BUDGET.weekTitle, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(BUDGET.weekIntro, locale)}</p>
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

  const counts = facetCounts(data, filters, now);
  const attempt = (overrides: Partial<{ budget: number; days: number[] }>): WeekResult =>
    planWeek(data, filters, {
      budget: overrides.budget ?? request.budget ?? 0,
      days: overrides.days ?? request.days,
      seed: request.seed ?? "",
      locks: allPins(request),
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
    <Container className="py-8">
      <div className="no-print">{breadcrumbs}</div>
      <Stack space={6}>
        <div className="no-print">{header}</div>
        <WeekForm locale={locale} request={request} filters={filters} />
        <div className="no-print">
          <SpendThisWeek locale={locale} explain={false} />
          <p className="m-0 mt-[var(--space-2)] text-sm">
            <Link href={localePath(locale, "/eat/mine")}>{t(BUDGET.mineTitle, locale)}</Link>
          </p>
        </div>
        <EatFilteredLayout locale={locale} data={data} filters={filters} counts={counts} route={ROUTE} display="none" carry={carry}>
          <Stack space={6}>
            {body}
            <InsetText className="no-print">
              <p className="m-0 text-sm text-ink-900">{t(BUDGET.weekPriceNote, locale)}</p>
              <p className="m-0 mt-[var(--space-2)] text-sm text-ink-900">{t(EAT.dietNote, locale)}</p>
            </InsetText>
          </Stack>
        </EatFilteredLayout>
      </Stack>
    </Container>
  );
}

interface Suggestion {
  key: string;
  kind: "raise" | "fewer" | "unlock";
  value?: number;
}

/** Concrete next steps for a failure: a budget that works, fewer days, or fewer pins. Computed, never guessed. */
function suggestionsFor(reason: WeekFailure, request: WeekRequest, attempt: (o: Partial<{ budget: number; days: number[] }>) => WeekResult): Suggestion[] {
  const out: Suggestion[] = [];
  const budgetNow = request.budget ?? 0;
  if (reason === "budgetTooLow" || reason === "noPlan") {
    for (const extra of [20, 40, 60, 80, 100, 150, 200, 300, 400, 600]) {
      if (attempt({ budget: budgetNow + extra }).ok) {
        out.push({ key: "raise", kind: "raise", value: budgetNow + extra });
        break;
      }
    }
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
        <strong>{t(BUDGET.failTitle, locale)}.</strong> {t(FAILURE_TEXT[reason], locale)}
      </WarningText>
      {suggestions.length > 0 || countActiveValues(filters) > 0 ? (
        <section aria-labelledby="week-suggest-title" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="week-suggest-title" visualLevel={4} className="m-0">
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
                  href={eatHref(locale, ROUTE, defaultFilters(), { budget: request.budget, days: request.days.join(","), seed: request.seed })}
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
