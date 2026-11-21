/**
 * Start page for "Report something found". The public can hand an item in at
 * the TUSU or TUSC desk, or report it here first; the page says both, plainly.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StartPage } from "../_journey/StartPage";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getServicePageText } from "@/lib/content/service-text";
import { listItems } from "@/lib/content/service-pages";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/lost-and-found/found"),
    title: UI.reportFoundItem[locale],
    description: (await getServicePageText("foundReport")).intro[locale],
  };
}

export default async function ReportFoundStartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const [query, t] = await Promise.all([searchParams, getServicePageText("foundReport")]);

  return (
    <StartPage
      kind="found"
      locale={locale}
      intro={t.intro[locale]}
      note={t.deskNote[locale]}
      need={listItems(t.need[locale])}
      expired={first(query.expired) === "1"}
      problem={first(query.problem) === "1"}
    />
  );
}
