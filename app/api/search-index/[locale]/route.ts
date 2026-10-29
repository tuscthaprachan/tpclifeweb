/**
 * Serves the prebuilt search index as JSON, for the client-side combobox in
 * `components/domain/search/SearchBar.tsx` to fetch lazily on first
 * interaction, and for the static results page
 * (`components/domain/search/LiveSearch.tsx`) to rank results in the browser.
 * The server-rendered copy (`app/[locale]/filtered/search/page.tsx`) does not
 * call this: it calls `getSearchIndex()` directly, since it is already
 * running server-side and a self-fetch would be a pointless network hop.
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
 * - Data: `getSearchIndex()` (lib/content/search-index.ts) is cached and
 *   tagged with `CACHE_TAGS.searchIndex`, so `revalidateFor` invalidates this
 *   specific entry the moment content changes, without waiting out the hour.
 */

import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/config";
import { getSearchIndex } from "@/lib/content";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const index = await getSearchIndex();
  return NextResponse.json(index);
}
