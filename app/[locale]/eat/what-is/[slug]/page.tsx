/**
 * One canonical dish for someone who has never had it: the explainer, which
 * stalls make it and at what price.
 *
 * Prerendered for every dish: it does not read the query.
 * components/domain/canteen/pages/WhatIs.tsx reads the filters (which only the links carry on) in the browser,
 * and a full page load of a URL with a query is answered by the copy under `filtered/` instead.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EXTRAS } from "@/components/domain/canteen/extras";
import { indexCanteen } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { slugParams } from "@/lib/static-params";
import { getCanteenData } from "@/lib/content";
import { EatWhatIsDish } from "./EatWhatIsDish";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  const data = await getCanteenData();
  return slugParams(data.canonicals.map((canonical) => canonical.slug.current));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const canonical = indexCanteen(data).canonicalBySlug.get(slug);
  if (!canonical) return {};
  return {
    alternates: alternatesFor(locale, `/eat/what-is/${slug}`),
    title: pick(canonical.name, locale),
    description: pick(canonical.explainer, locale) || EXTRAS.whatIsIntro[locale],
  };
}

export default async function WhatIsDishPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  return <EatWhatIsDish locale={locale} slug={slug} filtered={false} />;
}
