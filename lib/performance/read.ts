import "server-only";

import { getDb } from "@/lib/db";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "@/lib/content/cache";
import { safeFetch } from "@/lib/content/safe-fetch";
import type { Period } from "./period";
import { buildPerformanceReport, type PerformanceReport } from "./report";

/**
 * The public page's figures. Cached for an hour on the content window (and
 * tagged, so `revalidateTag("performance")` refreshes it at once) so the page
 * does not run its aggregates on every request. The period is the only
 * argument; the clock is read inside, so a cached report carries the time it
 * was worked out, which the page shows as "last updated". The key carries a
 * version, bumped when the shape of the report changes, so a deployment never
 * reads a report cached in the old shape.
 */
const cachedReport = cachedRead(["performance-report", "v2"], [CACHE_TAGS.performance], REVALIDATE.content, (period: Period) =>
  buildPerformanceReport(getDb(), period, new Date()),
);

/** Null when the database cannot be read; the page then says the figures are unavailable. */
export async function getPerformanceReport(period: Period): Promise<PerformanceReport | null> {
  return safeFetch<PerformanceReport | null>("getPerformanceReport", () => cachedReport(period), null);
}
