/**
 * The full canteen map. Reads the shared canteen filter parameters, so
 * "no pork, under 50 baht" set on the dishes page carries over: with any
 * filter on, each stall shows how many dishes match and stalls with none
 * are hatched. Two extra parameters draw a route:
 *
 *   highlight  comma separated stall slugs, drawn as numbered stops
 *   from       index of the entrance the route starts at (0 is the first)
 *
 * Prerendered: it does not read the query. components/domain/canteen/pages/Map.tsx reads the parameters in the
 * browser, and a full page load of a URL with a query is answered by the copy under `filtered/` instead, so it
 * works with JavaScript off. The floor plan is from a survey, not a live feed.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MAP_STRINGS } from "@/components/domain/canteen/map";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatMap } from "./EatMap";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/eat/map"),
    title: MAP_STRINGS.pageTitle[locale],
    description: MAP_STRINGS.pageIntro[locale],
  };
}

export default async function CanteenMapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatMap locale={locale} filtered={false} />;
}
