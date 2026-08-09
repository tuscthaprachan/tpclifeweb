"use server";

/**
 * Zero-result search logging.
 *
 * A query that returns nothing is a content gap signal worth knowing about,
 * so the search results page (`app/[locale]/search/page.tsx`) calls this
 * once, server-side, whenever a non-empty query produces zero results.
 *
 * What is stored, exactly: the trimmed query text and an ISO timestamp,
 * written as one JSON line to stdout, where the hosting platform's own log
 * capture picks it up. That is the entire dataset.
 *
 * What is deliberately NOT stored: no IP address, no session id, no cookie,
 * no user agent, no locale, no referrer, no device fingerprint, nothing
 * that could identify or re-identify the person who typed the query.
 * Privacy first: if a future need for more than the query text and a
 * timestamp appears, that is a new decision made in the open, not a quiet
 * extension of this function.
 */
export async function logZeroResultSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return;

   
  console.log(
    JSON.stringify({
      event: "search.zero_results",
      query: trimmed,
      at: new Date().toISOString(),
    }),
  );
}
