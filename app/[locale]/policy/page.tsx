/**
 * The policy dashboard: every policy from both TUSU and TUSC, combined but
 * always attributed (lib/content/types.ts, "Policy tracker"). Filterable by
 * owner, policy area and status through query parameters, working with
 * JavaScript off, via a real `<form method="get">`
 * (components/domain/policy/PolicyFilters.tsx), following the exact pattern
 * of app/[locale]/forms/page.tsx.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { PolicyIndex } from "./PolicyIndex";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/policy"),
    title: UI.policyTracker[locale],
    description: UI.policyIntro[locale],
  };
}

export default async function PolicyDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PolicyIndex locale={locale} filtered={false} />;
}
