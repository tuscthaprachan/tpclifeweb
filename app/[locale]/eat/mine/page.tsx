/**
 * Your stuff: favourites, history, dislikes, saved default filters, the saved
 * week and the spend log. All of it lives in this device's localStorage, so
 * the page is a prerendered shell around a client component. Without
 * JavaScript the shell says why the page cannot show anything. The page
 * passes the menu (small records) so slugs can be resolved to names, and the
 * browser adds the filters of the address, which the page itself never reads.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { t } from "@/components/domain/canteen";
import { BUDGET } from "@/components/domain/canteen/budget/strings";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatMine } from "./EatMine";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/mine"),
    title: t(BUDGET.mineTitle, locale),
    description: t(BUDGET.mineIntro, locale),
    // Personal and empty for everyone who has not used it: nothing here for a search engine.
    robots: { index: false },
  };
}

export default async function EatMinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatMine locale={locale} filtered={false} />;
}
