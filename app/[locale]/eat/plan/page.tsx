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
 *
 * Prerendered as the meal planner without a budget: it does not read the query.
 * components/domain/canteen/pages/Plan.tsx reads the mode and the rest in the browser, and a full page load of a
 * URL with a query is answered by the copy under `filtered/` instead, which also does the redirects.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { t } from "@/components/domain/canteen";
import { PLAN_COPY } from "@/components/domain/canteen/plan/copy";
import { PLAN_ROUTE } from "@/components/domain/canteen/plan/mode";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatPlan } from "./EatPlan";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const copy = PLAN_COPY.meal;
  return {
    alternates: alternatesFor(locale, PLAN_ROUTE),
    title: t(copy.title, locale),
    description: t(copy.intro, locale),
  };
}

export default async function EatPlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatPlan locale={locale} filtered={false} />;
}
