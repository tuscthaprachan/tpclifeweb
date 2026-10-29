/**
 * The published performance figures for one period, assembled from the
 * per-service queries. Everything in a `PerformanceReport` has been through
 * the small-number rule (./suppress.ts) and is JSON serialisable, so it can be
 * cached. The staff dashboard shows this same report beside its live counts.
 */

import type { AuditExecutor } from "@/lib/db/audit";
import { complaintMeasures, type ComplaintMeasures } from "./complaints";
import { journeyMeasures, signpostMeasures, type JourneyRow, type SignpostMeasures } from "./journeys";
import { lostFoundMeasures, type LostFoundMeasures } from "./lost-found";
import { rangeFor, type Period } from "./period";

export interface PerformanceReport {
  period: Period;
  /** ISO. The start of the period, or null for all time. */
  from: string | null;
  /** ISO. When the figures were worked out. */
  generatedAt: string;
  lostFound: LostFoundMeasures;
  complaints: ComplaintMeasures;
  journeys: JourneyRow[];
  signposts: SignpostMeasures;
}

export async function buildPerformanceReport(db: AuditExecutor, period: Period, now: Date = new Date()): Promise<PerformanceReport> {
  const range = rangeFor(period, now);
  const [lostFound, complaints, journeys, signposts] = await Promise.all([
    lostFoundMeasures(db, range),
    complaintMeasures(db, range, now, period !== "30d"),
    journeyMeasures(db, range, now),
    signpostMeasures(db, range),
  ]);
  return { period, from: range.from?.toISOString() ?? null, generatedAt: now.toISOString(), lostFound, complaints, journeys, signposts };
}
