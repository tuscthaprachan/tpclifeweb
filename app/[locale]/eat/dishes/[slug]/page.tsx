/**
 * One dish: the surveyed price with its date and every option, the stall and
 * how to find it, diet, and the same dish at other stalls with the
 * cheapest marked. Carries the reader's filters into every link.
 *
 * Prerendered for every dish: it does not read the query.
 * components/domain/canteen/pages/DishDetail.tsx reads the filters in the browser, and a full page load of a URL
 * with a query is answered by the copy under `filtered/` instead.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { eat } from "@/components/domain/canteen";
import { indexCanteen, stallOf } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { slugParams } from "@/lib/static-params";
import { getCanteenData } from "@/lib/content";
import { EatDish } from "./EatDish";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  const data = await getCanteenData();
  return slugParams(data.dishes.map((dish) => dish.slug.current));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const dish = indexCanteen(data).dishBySlug.get(slug);
  if (!dish) return {};
  const stall = stallOf(data, dish);
  return {
    alternates: alternatesFor(locale, `/eat/dishes/${slug}`),
    title: pick(dish.name, locale),
    description: stall ? `${eat.dishAtStall(locale, pick(dish.name, locale), eat.stallFull(locale, stall.number, pick(stall.name, locale)))}` : undefined,
  };
}

export default async function EatDishPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  return <EatDish locale={locale} slug={slug} filtered={false} />;
}
