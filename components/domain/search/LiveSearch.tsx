"use client";

/**
 * The search page in the browser: reads `?q=` from the URL, fetches the
 * edge-cached search index (the same one the combobox in `SearchBar` uses)
 * once per locale, and ranks the results locally with the same `search` the
 * server uses. Zero-result queries are logged through the same server action
 * the server-rendered page calls.
 *
 * If the index cannot be fetched, the page is reloaded as a plain document
 * request, which the server answers with the server-rendered results.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { SearchIndex, SearchRecord } from "@/lib/content/types";
import { search } from "@/lib/search";
import { logZeroResultSearch } from "@/lib/search/log-zero-result";
import { useQueryRecord } from "@/lib/use-query";
import { SearchPageView } from "./SearchPageView";

const indexRequests = new Map<Locale, Promise<SearchRecord[]>>();

function loadRecords(locale: Locale): Promise<SearchRecord[]> {
  const existing = indexRequests.get(locale);
  if (existing) return existing;

  const request = fetch(`/api/search-index/${locale}`)
    .then((response) => {
      if (!response.ok) throw new Error(`search index request failed: ${response.status}`);
      return response.json() as Promise<SearchIndex>;
    })
    .then((index) => index.records)
    .catch((error: unknown) => {
      indexRequests.delete(locale);
      throw error;
    });

  indexRequests.set(locale, request);
  return request;
}

export function LiveSearch({ locale }: { locale: Locale }) {
  const query = useQueryRecord().q ?? "";
  const hasQuery = query.trim().length > 0;
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    loadRecords(locale).then(
      (loaded) => {
        if (!cancelled) setRecords(loaded);
      },
      () => {
        if (!cancelled) window.location.reload();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [locale, hasQuery]);

  const results = useMemo(() => (hasQuery && records ? search(query, records) : null), [hasQuery, query, records]);

  useEffect(() => {
    if (!hasQuery || results === null || results.length > 0 || loggedRef.current === query) return;
    loggedRef.current = query;
    void logZeroResultSearch(query);
  }, [hasQuery, query, results]);

  return <SearchPageView locale={locale} query={query} results={hasQuery ? results : []} />;
}
