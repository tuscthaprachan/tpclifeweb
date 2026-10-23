/**
 * Case references: "LF-2026-0001" (lost and found), later "CP-2026-0001"
 * (complaints).
 *
 * RACE SAFETY. Each (prefix, year) has one row in `reference_counters`, and
 * allocation is a single atomic statement:
 *
 *   insert ... values (prefix, year, 1)
 *   on conflict (prefix, year) do update set last_value = reference_counters.last_value + 1
 *   returning last_value
 *
 * Postgres takes a row lock on the conflicting row, so concurrent callers are
 * serialised on it: the second waits for the first to commit or roll back, then
 * increments the committed value. No two callers can receive the same number,
 * with no retry loop and no read-then-write window. Because the increment is
 * part of the caller's transaction, a rolled-back submission gives its number
 * back, so numbers stay gapless (a Postgres SEQUENCE would leave gaps on
 * rollback, and a sequence per year would need DDL at year rollover).
 *
 * Call it inside the same transaction that inserts the row that uses the
 * reference (pass the `tx` from `withAudit`). The `unique` constraint on
 * `lost_found_items.reference` is a backstop, not the mechanism.
 *
 * No `server-only` import so it runs under PGlite in tests.
 */

import { sql } from "drizzle-orm";
import type { AuditExecutor } from "./audit";
import { referenceCounters } from "./schema/content/lost-found";

export const LOST_FOUND_PREFIX = "LF";

export function formatReference(prefix: string, year: number, n: number): string {
  return `${prefix}-${String(year).padStart(4, "0")}-${String(n).padStart(4, "0")}`;
}

/** Allocate the next reference for `prefix` in `year`, for example `nextReference(tx, "CP", 2026)`. */
export async function nextReference(tx: AuditExecutor, prefix: string, year: number): Promise<string> {
  const rows = await tx
    .insert(referenceCounters)
    .values({ prefix, year, lastValue: 1 })
    .onConflictDoUpdate({
      target: [referenceCounters.prefix, referenceCounters.year],
      set: { lastValue: sql`${referenceCounters.lastValue} + 1` },
    })
    .returning({ lastValue: referenceCounters.lastValue });
  const n = rows[0]?.lastValue;
  if (n === undefined) throw new Error(`Could not allocate a ${prefix} reference for ${year}`);
  return formatReference(prefix, year, n);
}

/** The next lost and found reference, for example "LF-2026-0001". `year` is the Gregorian year in Asia/Bangkok. */
export function nextLostFoundReference(tx: AuditExecutor, year: number): Promise<string> {
  return nextReference(tx, LOST_FOUND_PREFIX, year);
}
