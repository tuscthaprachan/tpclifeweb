/**
 * Serves the prebuilt search index as JSON, for the client-side combobox in
 * `components/domain/search/SearchBar.tsx` to fetch lazily on first
 * interaction. The server-rendered results page
 * (`app/[locale]/search/page.tsx`) does not call this: it calls
 * `getSearchIndex()` directly, since it is already running server-side and a
 * self-fetch would be a pointless network hop.
 *
 * `[locale]` only validates the request; the response is the same
 * `SearchIndex` either way, because every `SearchRecord` already carries
 * both languages (`title`, `summary`, `path` are `{ th, en }`, and
 * `haystack` concatenates both) so the client can match and display in
 * either language from one payload without a second fetch when the reader
 * switches language.
 *
 * Caching has two layers:
 * - Edge/CDN: `next.config.ts` sets `Cache-Control` for exactly this path
 *   (`public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`).
 * - Data: `getSearchIndex()` is wrapped in `unstable_cache` here, tagged
 *   with `CACHE_TAGS.searchIndex`, so the revalidation webhook can call
 *   `revalidateTag(CACHE_TAGS.searchIndex)` to invalidate this specific
 *   entry the moment content changes, without waiting out the hour.
 */

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/config";
import { CACHE_TAGS } from "@/lib/sanity/env";
import { getSearchIndex } from "@/lib/sanity/queries";

const getCachedSearchIndex = unstable_cache(() => getSearchIndex(), ["search-index"], {
  tags: [CACHE_TAGS.searchIndex],
  revalidate: 3600,
});

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const index = await getCachedSearchIndex();
  return NextResponse.json(index);
}
