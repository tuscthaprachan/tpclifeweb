/**
 * One stall: who it is, how to find it, and its full menu grouped by type.
 * With filters on, a line says how many of its dishes match, but the whole
 * menu is always shown: a stall page is the place to see everything.
 * Matching dishes carry a tag and come first within each type.
 *
 * Prerendered for every stall: it does not read the query.
 * components/domain/canteen/pages/StallDetail.tsx reads the filters in the browser, and a full page load of a URL
 * with a query is answered by the copy under `filtered/` instead.
 */

import type { Metadata } from "next";

import { EAT, eat, t } from "@/components/domain/canteen";
import { indexCanteen } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { slugParams } from "@/lib/static-params";
import { getCanteenData } from "@/lib/content";
import { notFound } from "next/navigation";
import { EatStall } from "./EatStall";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  const data = await getCanteenData();
  return slugParams(data.stalls.map((stall) => stall.slug.current));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const stall = indexCanteen(data).stallBySlug.get(slug);
  if (!stall) return {};
  return {
    alternates: alternatesFor(locale, `/eat/stalls/${slug}`),
    title: eat.stallFull(locale, stall.number, pick(stall.name, locale)),
    description: stall.wayfinding ? pick(stall.wayfinding, locale) : t(EAT.stallsIntro, locale),
  };
}

export default async function EatStallPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  return <EatStall locale={locale} slug={slug} filtered={false} />;
}
