import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { pick } from "@/lib/i18n/config";
import type { SearchResult } from "@/lib/search";
import { Heading, Link, Stack, Tag, type TagTone } from "@/components/ui";
import { SEARCH_TYPE_LABEL } from "./searchTypeLabels";

interface SearchResultItemProps {
  result: SearchResult;
  locale: Locale;
  headingLevel: HeadingLevel;
}

/**
 * `Category` and `TagTone` share the same four values on purpose (see
 * `components/ui/Tag.tsx`), so a record's category can drive the tag colour
 * directly. Records without a category (news, policies, the directory
 * types) fall back to the neutral tone rather than guessing one.
 */
function toneFor(category: SearchResult["record"]["category"]): TagTone {
  return category ?? "neutral";
}

export function SearchResultItem({ result, locale, headingLevel }: SearchResultItemProps) {
  const { record } = result;
  // record.path already carries the locale prefix (see getSearchIndex in
  // lib/sanity/queries.ts, which builds "/th/forms/slug" and "/en/forms/slug"
  // directly), so this is used as-is rather than passed through localePath
  // again, which would double the prefix.
  const href = record.path[locale];
  const title = pick(record.title, locale);
  const summary = pick(record.summary, locale);
  const typeLabel = pick(SEARCH_TYPE_LABEL[record.type], locale);

  return (
    <li className="border-b border-line py-[var(--space-4)] last:border-b-0">
      <Stack space={2}>
        <Tag tone={toneFor(record.category)}>{typeLabel}</Tag>
        <Heading level={headingLevel} visualLevel={3} className="m-0">
          <Link href={href} locale={locale} className="text-action no-underline hover:underline">
            {title}
          </Link>
        </Heading>
        {summary ? <p className="m-0 text-ink-600">{summary}</p> : null}
      </Stack>
    </li>
  );
}
