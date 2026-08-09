import "server-only";

/**
 * Fetching from Sanity without letting a CMS outage take the site down.
 *
 * WHY THIS EXISTS
 * `client.fetch` rejects on any transport failure: the CMS is unreachable, the
 * project id is wrong, a token expired, the network dropped. Left unhandled,
 * that rejection propagates out of a Server Component and Next renders the
 * error boundary, so a student looking for the next shuttle gets a blank error
 * page instead of the page they asked for.
 *
 * That is the wrong failure mode for this service. Most of what TPC Life shows
 * degrades gracefully: a news list with no items reads as "nothing here yet",
 * which is a normal state the components already handle and already say in both
 * languages. Losing the whole page loses the navigation, the search box and the
 * help contacts along with the content.
 *
 * So: a failed read returns the fallback and the page renders its empty state.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not hide the failure. Every caught error is logged on the server with
 * the label of the query that failed, so an outage is visible in the Vercel
 * logs rather than silently looking like an empty dataset.
 *
 * It also does not paper over a MISSING document, which is a different thing. A
 * page asked for by slug that does not exist must still call `notFound()` and
 * return a real 404. `safeFetch` returning `null` for a single document means
 * "could not read", and the caller decides what that means. Where the two need
 * telling apart, use `safeFetchResult` and check `ok`.
 */

export interface FetchResult<T> {
  /** False when the read failed. Distinguishes "CMS down" from "no such document". */
  ok: boolean;
  data: T;
}

/**
 * Runs a Sanity read and returns `fallback` if it throws.
 *
 * `label` names the query in the server log. Use the query's own name so a log
 * line points straight at the code, for example "getUpcomingEvents".
 */
export async function safeFetch<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const result = await safeFetchResult(label, run, fallback);
  return result.data;
}

/** As `safeFetch`, but tells the caller whether the read actually succeeded. */
export async function safeFetchResult<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<FetchResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    // Server-side only. This never reaches the browser, so it can be blunt.
    console.error(
      `[sanity] ${label} failed, falling back to an empty result. ` +
        `The page will render its empty state.`,
      error instanceof Error ? error.message : error,
    );
    return { ok: false, data: fallback };
  }
}
