/**
 * Server-rendered search results for `?q=`, so search works with JavaScript
 * off (the plain `<form method="get">` in `SearchBar` lands here) and every
 * result set is a linkable, shareable URL.
 *
 * Runs `getSearchIndex()` directly rather than calling
 * `/api/search-index/[locale]`: this is already a server component, so a
 * self-fetch over HTTP would be a pointless round trip for data already
 * available in-process.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { search } from "@/lib/search";
import { logZeroResultSearch } from "@/lib/search/log-zero-result";
import { getSearchIndex } from "@/lib/sanity/queries";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { SearchBar } from "@/components/domain/search/SearchBar";
import { SearchResults } from "@/components/domain/search/SearchResults";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

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

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const { q } = await searchParams;
  const query = firstValue(q);

  const index = await getSearchIndex();
  const results = query.trim().length > 0 ? search(query, index.records) : [];

  if (query.trim().length > 0 && results.length === 0) {
    await logZeroResultSearch(query);
  }

  return (
    <Container className="py-8 sm:py-12">
      <Stack space={8}>
        <Stack space={4}>
          <Heading level={1}>{UI.searchResults[locale]}</Heading>
          <SearchBar locale={locale} defaultValue={query} />
        </Stack>

        {query.trim().length === 0 ? null : results.length > 0 ? (
          <Stack space={4}>
            <p className="m-0 text-ink-600">
              {results.length} {UI.results[locale]}
            </p>
            <SearchResults results={results} locale={locale} groupHeadingLevel={2} />
          </Stack>
        ) : (
          <EmptyState title={UI.searchNoResults[locale]}>{UI.searchNoResultsHelp[locale]}</EmptyState>
        )}
      </Stack>
    </Container>
  );
}
