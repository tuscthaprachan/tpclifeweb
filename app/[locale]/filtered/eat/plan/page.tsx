import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { t } from "@/components/domain/canteen";
import { PLAN_COPY } from "@/components/domain/canteen/plan/copy";
import { PLAN_ROUTE, readPlanMode } from "@/components/domain/canteen/plan/mode";
import { planTarget } from "@/components/domain/canteen/redirects";
import { newSeed } from "@/lib/canteen/random";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { getCanteenData } from "@/lib/content";
import { EatPlan } from "../../../eat/plan/EatPlan";

type Query = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const copy = PLAN_COPY[readPlanMode(await searchParams)];
  return {
    alternates: alternatesFor(locale, PLAN_ROUTE),
    title: t(copy.title, locale),
    description: t(copy.intro, locale),
  };
}

export default async function FilteredEatPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const target = planTarget(locale, await searchParams, await getCanteenData(), newSeed());
  if (target !== null) redirect(target);
  return <EatPlan locale={locale} filtered />;
}
