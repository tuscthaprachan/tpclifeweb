/**
 * Plan a meal: three planners on one page, told apart by `?mode=`.
 *
 *   meal   (default) a meal that fits one budget
 *   week   one lunch a day for the week, inside a weekly budget
 *   group  a stall that works for everyone in a group
 *
 * The switch is a row of links, so changing mode needs no JavaScript and every
 * mode has an address that can be shared. Each mode keeps the query
 * parameters it always had, filters included.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EAT, readFilters, t, type Bilingual } from "@/components/domain/canteen";
import { BUDGET } from "@/components/domain/canteen/budget/strings";
import { GROUP } from "@/components/domain/canteen/group/strings";
import { GroupMode } from "@/components/domain/canteen/plan/GroupMode";
import { MealMode } from "@/components/domain/canteen/plan/MealMode";
import { PLAN_ROUTE, readPlanMode, type PlanMode } from "@/components/domain/canteen/plan/mode";
import { PlanModeSwitch } from "@/components/domain/canteen/plan/PlanModeSwitch";
import { WeekMode } from "@/components/domain/canteen/plan/WeekMode";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

type Query = Record<string, string | string[] | undefined>;

const COPY: Record<PlanMode, { title: Bilingual; intro: Bilingual }> = {
  meal: { title: BUDGET.mealTitle, intro: BUDGET.mealIntro },
  week: { title: BUDGET.weekTitle, intro: BUDGET.weekIntro },
  group: { title: GROUP.pageTitle, intro: GROUP.pageIntro },
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const copy = COPY[readPlanMode(await searchParams)];
  return {
    alternates: alternatesFor(locale, PLAN_ROUTE),
    title: t(copy.title, locale),
    description: t(copy.intro, locale),
  };
}

export default async function EatPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const mode = readPlanMode(query);
  const copy = COPY[mode];

  return (
    <Container className="pb-8 pt-2">
      <div className="no-print">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: UI.home[locale], path: "/" },
            { label: t(EAT.title, locale), path: "/eat" },
            { label: t(EAT.planTitle, locale) },
          ]}
        />
      </div>
      <Stack space={6}>
        <div className="no-print">
          <Stack space={4}>
            <Stack space={2}>
              <Heading level={1} className="text-3xl">{t(copy.title, locale)}</Heading>
              <p className="m-0 text-ink-600">{t(copy.intro, locale)}</p>
            </Stack>
            <PlanModeSwitch locale={locale} current={mode} filters={readFilters(query)} />
          </Stack>
        </div>
        {mode === "week" ? (
          <WeekMode locale={locale} query={query} />
        ) : mode === "group" ? (
          <GroupMode locale={locale} query={query} />
        ) : (
          <MealMode locale={locale} query={query} />
        )}
      </Stack>
    </Container>
  );
}
