/**
 * Search results for `?q=`. The page is static: with JavaScript the results
 * are worked out in the browser from the cached search index
 * (components/domain/search/LiveSearch.tsx). Without JavaScript the plain
 * `<form method="get">` in `SearchBar` lands on the server-rendered copy
 * (app/[locale]/filtered/search/page.tsx), so every result set is a
 * linkable, shareable URL.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LiveSearch } from "@/components/domain/search/LiveSearch";
import { SearchPageView } from "@/components/domain/search/SearchPageView";

/**
 * Without this the page inherits the layout's default title, which is the
 * service name, so /search and / were indistinguishable in the tab strip, in
 * browser history and to a screen reader. That is a 2.4.2 Page Titled failure.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    title: UI.searchResults[locale],
    alternates: alternatesFor(locale, "/search"),
  };
}

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <QueryBoundary filtered={false} fallback={<SearchPageView locale={locale} query="" results={[]} />}>
      <LiveSearch locale={locale} />
    </QueryBoundary>
  );
}
