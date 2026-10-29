/**
 * Every dish, filterable. This is where the filters live: a real GET form
 * (column on desktop, Dialog on phones, a copy inside <noscript>), counts on
 * every option, grouping by stall or by dish with a price comparison,
 * sorting, a search box, twenty dishes at a time with a "Show more" link
 * (`?show=40`, an address of its own, so Back and no JavaScript both work)
 * and, when nothing matches, the best ways to get dishes back.
 *
 * Prerendered: it does not read the query. components/domain/canteen/pages/Dishes.tsx reads the filters in the
 * browser, and a full page load of a URL with a query is answered by the copy under `filtered/` instead, so it
 * works without JavaScript.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EAT, t } from "@/components/domain/canteen";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatDishes } from "./EatDishes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/dishes"),
    title: t(EAT.dishesTitle, locale),
    description: t(EAT.dishesIntro, locale),
  };
}

export default async function EatDishesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatDishes locale={locale} filtered={false} />;
}
