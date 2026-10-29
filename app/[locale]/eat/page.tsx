/**
 * What to eat: the hub. One page that answers "what do I eat" three ways:
 * let the site decide (the block at the top, a plain GET form to /eat/pick),
 * browse (Dishes, Stalls and Map, each a card that is one real link), look at
 * a few suggested dishes, or use a tool (budget, week, group, explainers). Everything carries the current filters.
 *
 * Prerendered: it does not read the query. components/domain/canteen/pages/EatHub.tsx reads the filters in the
 * browser, and a full page load of a URL with a query is answered by the copy under `filtered/` instead. Works
 * without JavaScript. Nothing on it says live.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EAT, t } from "@/components/domain/canteen";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatHub } from "./EatHub";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat"),
    title: t(EAT.title, locale),
    description: t(EAT.intro, locale),
  };
}

export default async function EatHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatHub locale={locale} filtered={false} />;
}
