/**
 * Performance: the figures the Service Standard asks every service to publish
 * (completion rate, user satisfaction, digital take-up, time to resolution,
 * return rate), for lost and found and complaints. Read from the database as
 * SQL aggregates (lib/performance), hidden below five cases, and cached for an
 * hour. The period is a plain `?period=` link, so it works without JavaScript;
 * every period's figures are sent with the page and chosen in the browser
 * (components/domain/performance/PerformanceResults.tsx).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { PerformanceIndex } from "./PerformanceIndex";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/performance"),
    title: UI.perfTitle[locale],
    description: UI.perfIntro[locale],
  };
}

export default async function PerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PerformanceIndex locale={locale} filtered={false} />;
}
