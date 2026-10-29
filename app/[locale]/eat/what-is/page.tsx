/**
 * What is this dish: every canonical dish A to Z in the reader's language,
 * with a short explainer and the price range across the canteen. For
 * exchange and international students who have never met the dish.
 *
 * Prerendered: it does not read the query. components/domain/canteen/pages/WhatIs.tsx reads the filters (which only
 * the links carry on) in the browser, and a full page load of a URL with a query is answered by the copy under
 * `filtered/` instead.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EXTRAS } from "@/components/domain/canteen/extras";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatWhatIs } from "./EatWhatIs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/what-is"),
    title: EXTRAS.whatIsTitle[locale],
    description: EXTRAS.whatIsIntro[locale],
  };
}

export default async function WhatIsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatWhatIs locale={locale} filtered={false} />;
}
