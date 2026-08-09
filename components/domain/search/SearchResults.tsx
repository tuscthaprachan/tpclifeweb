import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { pick } from "@/lib/i18n/config";
import type { SearchResult } from "@/lib/search";
import type { SearchableType } from "@/lib/sanity/types";
import { Heading, Stack } from "@/components/ui";
import { SEARCH_TYPE_LABEL } from "./searchTypeLabels";
import { SearchResultItem } from "./SearchResultItem";

interface SearchResultsProps {
  results: SearchResult[];
  locale: Locale;
  /** The heading level for each type group. Result titles render one level below this. */
  groupHeadingLevel: HeadingLevel;
}

/**
 * Groups already-ranked results by `SearchableType`, preserving rank order
 * both for which group appears first (the type of the single best-scoring
 * result) and for the order of items within each group.
 */
function groupByType(results: SearchResult[]): Array<{ type: SearchableType; items: SearchResult[] }> {
  const order: SearchableType[] = [];
  const byType = new Map<SearchableType, SearchResult[]>();

  for (const result of results) {
    const type = result.record.type;
    const existing = byType.get(type);
    if (existing) {
      existing.push(result);
    } else {
      byType.set(type, [result]);
      order.push(type);
    }
  }

  return order.map((type) => ({ type, items: byType.get(type) ?? [] }));
}

export function SearchResults({ results, locale, groupHeadingLevel }: SearchResultsProps) {
  const groups = groupByType(results);
  const itemHeadingLevel: HeadingLevel = groupHeadingLevel < 6 ? ((groupHeadingLevel + 1) as HeadingLevel) : 6;

  return (
    <Stack space={8}>
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`search-group-${group.type}`}>
          <Heading level={groupHeadingLevel} id={`search-group-${group.type}`}>
            {pick(SEARCH_TYPE_LABEL[group.type], locale)}
          </Heading>
          <ul className="m-0 mt-[var(--space-3)] list-none p-0">
            {group.items.map((result) => (
              <SearchResultItem
                key={result.record.id}
                result={result}
                locale={locale}
                headingLevel={itemHeadingLevel}
              />
            ))}
          </ul>
        </section>
      ))}
    </Stack>
  );
}
