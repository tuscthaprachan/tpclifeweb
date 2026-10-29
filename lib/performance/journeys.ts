/**
 * Completion rate of the public journeys, from `journey_metrics` (schema in
 * lib/db/schema/journey-metrics.ts; the draft tables are encrypted, expire in
 * hours and are deleted, so they cannot be counted afterwards). A row is
 * written when a person starts a journey and completed when they send it.
 *
 *   started          journeys started in the period
 *   completion rate  of the journeys started in the period that are settled,
 *                    the share that were sent. A journey is settled once it
 *                    is sent or has been idle long enough for its draft to
 *                    expire, so one still open is neither a success nor a
 *                    drop-out. Starting again counts as a new journey
 *   signposted       issues the reporting service pointed to a faculty or to
 *                    the lecturer of a course instead of taking them as a
 *                    complaint. One row per signpost, nothing personal; the
 *                    kind is `signpost_<level>` (SIGNPOST_LEVELS)
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { journeyMetrics, JOURNEY_METRIC_KINDS, type JourneyMetricKind, type SignpostLevel } from "@/lib/db/schema/journey-metrics";
import type { Range } from "./period";
import { countMeasure, shareMeasure, type Measure } from "./suppress";
import { num, queryRows, within } from "./sql";

/** A draft lives two hours from its last save (the journey stores under lib/lost-found/public and lib/complaints/public), so a journey older than this and unsent has been given up. */
export const JOURNEY_SETTLE_MS = 2 * 60 * 60 * 1000;

export interface JourneyRow {
  kind: JourneyMetricKind;
  started: Measure;
  completionRate: Measure;
}

export async function journeyMeasures(db: AuditExecutor, range: Range, now: Date): Promise<JourneyRow[]> {
  const settledBefore = new Date(now.getTime() - JOURNEY_SETTLE_MS).toISOString();
  const rows = await queryRows<{ kind: string; started: number; settled: number; done: number }>(
    db,
    sql`select kind, count(*)::int as started,
        (count(*) filter (where ${journeyMetrics.finishedAt} is not null or ${journeyMetrics.startedAt} <= ${settledBefore}::timestamptz))::int as settled,
        (count(*) filter (where ${journeyMetrics.finishedAt} is not null))::int as done
      from ${journeyMetrics} where ${within(journeyMetrics.startedAt, range)} group by kind`,
  );
  return JOURNEY_METRIC_KINDS.map((kind) => {
    const row = rows.find((r) => r.kind === kind);
    return { kind, started: countMeasure(num(row?.started)), completionRate: shareMeasure(num(row?.done), num(row?.settled)) };
  });
}

export interface SignpostMeasures {
  /** Issues pointed to a faculty or programme body. */
  faculty: Measure;
  /** Issues pointed to the lecturer of a course (and the faculty office if that fails). */
  course: Measure;
}

/** Issues signposted to faculty and course level in the period. Emergency signposts are recorded but not published. */
export async function signpostMeasures(db: AuditExecutor, range: Range): Promise<SignpostMeasures> {
  const rows = await queryRows<{ kind: string; n: number }>(
    db,
    sql`select kind, count(*)::int as n from ${journeyMetrics}
      where kind in ('signpost_faculty', 'signpost_course') and ${within(journeyMetrics.startedAt, range)} group by kind`,
  );
  const count = (kind: string) => countMeasure(num(rows.find((r) => r.kind === kind)?.n));
  return { faculty: count("signpost_faculty"), course: count("signpost_course") };
}

/**
 * Records that a student was signposted to `level` (faculty, course or
 * emergency help) instead of making a complaint. No personal data and no link
 * to anything else. Never throws: counting must not stop a person getting the
 * contact details.
 */
export async function recordSignpost(db: AuditExecutor, level: SignpostLevel, now: Date = new Date()): Promise<void> {
  try {
    await db.insert(journeyMetrics).values({ id: crypto.randomUUID(), kind: `signpost_${level}`, startedAt: now, finishedAt: now });
  } catch (error) {
    console.error("[performance] could not count a signpost", error instanceof Error ? error.message : error);
  }
}

/** Records that a journey has started. Never throws: counting must not stop a person starting. */
export async function recordJourneyStart(db: AuditExecutor, id: string, kind: JourneyMetricKind, now: Date = new Date()): Promise<void> {
  try {
    await db.insert(journeyMetrics).values({ id, kind, startedAt: now }).onConflictDoNothing();
  } catch (error) {
    console.error("[performance] could not count a journey start", error instanceof Error ? error.message : error);
  }
}

/** Records that a journey was sent. Run it inside the transaction that makes the case, so the count and the case agree. */
export async function recordJourneyFinish(db: AuditExecutor, id: string, now: Date = new Date()): Promise<void> {
  await db
    .update(journeyMetrics)
    .set({ finishedAt: now })
    .where(and(eq(journeyMetrics.id, id), isNull(journeyMetrics.finishedAt)));
}
