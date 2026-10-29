import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { SearchResult } from "@/lib/search";
import { CanteenShortcutCallout } from "./CanteenShortcutCallout";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";

interface SearchPageViewProps {
  locale: Locale;
  query: string;
  /** Null while the results are still being worked out in the browser. */
  results: SearchResult[] | null;
}

export function SearchPageView({ locale, query, results }: SearchPageViewProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <Container className="pb-8 pt-2">
      <Stack space={8}>
        <Stack space={4}>
          <Heading level={1}>{UI.searchResults[locale]}</Heading>
          <SearchBar key={query} locale={locale} defaultValue={query} />
        </Stack>

        <CanteenShortcutCallout query={query} locale={locale} />

        {!hasQuery || results === null ? null : results.length > 0 ? (
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
