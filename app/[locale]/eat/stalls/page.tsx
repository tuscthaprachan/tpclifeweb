/**
 * Every stall, in stall number order (which follows the hall). Shares the filters with the
 * dish list: with filters on, each card says how many of its dishes match and
 * the price range covers just those, and stalls with none are shown plainly
 * as having none rather than hidden.
 *
 * Prerendered: it does not read the query. components/domain/canteen/pages/Stalls.tsx reads the filters in the
 * browser, and a full page load of a URL with a query is answered by the copy under `filtered/` instead.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EAT, t } from "@/components/domain/canteen";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatStalls } from "./EatStalls";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/stalls"),
    title: t(EAT.stallsTitle, locale),
    description: t(EAT.stallsIntro, locale),
  };
}

export default async function EatStallsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatStalls locale={locale} filtered={false} />;
}
