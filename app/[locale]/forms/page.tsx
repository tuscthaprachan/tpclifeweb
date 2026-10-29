/**
 * The forms index: every active form, filterable by category, owner and
 * whether sign-in is required. Filters are query-param driven
 * (components/domain/form/FormsResults.tsx reads them in the browser; components/domain/form/FormFilters.tsx
 * renders the real `<form method="get">` that writes them), so the page
 * works identically with JavaScript on or off and survives a reload or a
 * back navigation (3.3.7).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { FormsIndex } from "./FormsIndex";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/forms"),
    title: UI.forms[locale],
    description: UI.formsIntro[locale],
  };
}

export default async function FormsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <FormsIndex locale={locale} filtered={false} />;
}
