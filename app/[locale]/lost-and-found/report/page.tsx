/**
 * Start page for "Report something you lost". The journey itself is a series
 * of question pages (report/[step]) that work without JavaScript; this page
 * explains what is needed and opens the draft. Nothing is stored until
 * "Start now" is pressed.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StartPage } from "../_journey/StartPage";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
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
    alternates: alternatesFor(locale, "/lost-and-found/report"),
    title: UI.reportLostItem[locale],
    description: (await getServicePageText("lostReport")).intro[locale],
  };
}

export default async function ReportLostStartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const [query, t] = await Promise.all([searchParams, getServicePageText("lostReport")]);
  // Older links, such as ?kind=found, still land somewhere sensible.
  if (first(query.kind) === "found") redirect(localePath(locale, "/lost-and-found/found"));

  return (
    <StartPage
      kind="lost"
      locale={locale}
      intro={t.intro[locale]}
      need={listItems(t.need[locale])}
      expired={first(query.expired) === "1"}
      problem={first(query.problem) === "1"}
    />
  );
}
