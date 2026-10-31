import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TUSC_PATH, fillText } from "@/components/domain/open-data";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDecisions, getOpenDataMeetings } from "@/lib/open-data/read";
import { DecisionsIndex } from "./DecisionsIndex";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const [decisions, meetings] = await Promise.all([getOpenDataDecisions(), getOpenDataMeetings()]);
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/decisions`),
    title: `${UI.odNavDecisions[locale]} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odDcSummary[locale], { n: formatNumber(decisions.length, locale), meetings: formatNumber(meetings.length, locale) }),
  };
}

export default async function TuscDecisionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DecisionsIndex locale={locale} filtered={false} />;
}
