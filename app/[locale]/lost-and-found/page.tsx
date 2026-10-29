/**
 * The lost and found register: every open report, filterable by kind,
 * category and status, paginated. Filters are query-param driven
 * (components/domain/lostfound/LostFoundResults.tsx reads them in the browser;
 * components/domain/lostfound/LostFoundFilters.tsx renders the real
 * `<form method="get">` that writes them), so the whole page works
 * identically with JavaScript on or off (CONTRIBUTING.md, "search, filtering
 * and pagination must work with JavaScript off").
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { LostFoundIndex } from "./LostFoundIndex";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/lost-and-found"),
    title: UI.lostAndFound[locale],
    description: UI.lostAndFoundIntro[locale],
  };
}

export default async function LostAndFoundIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LostFoundIndex locale={locale} filtered={false} />;
}
