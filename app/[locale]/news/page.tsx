import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { NewsIndex } from "./NewsIndex";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/news"), title: UI.news[locale] };
}

export default async function NewsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <NewsIndex locale={locale} filtered={false} />;
}
