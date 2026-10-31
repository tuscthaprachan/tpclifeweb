import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fillText } from "@/components/domain/open-data";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataFunds } from "@/lib/open-data/read";
import { FUNDS_ROUTE, FundsIndex } from "./FundsIndex";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const funds = await getOpenDataFunds();
  return {
    alternates: alternatesFor(locale, FUNDS_ROUTE),
    title: `${UI.odFundsUniversityTitle[locale]} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odFundsSummary[locale], { n: formatNumber(funds.length, locale), r: formatNumber(8, locale) }),
  };
}

export default async function TuscFundsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <FundsIndex locale={locale} filtered={false} />;
}
