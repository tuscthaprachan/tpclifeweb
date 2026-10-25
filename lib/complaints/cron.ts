/**
 * The whole daily run for complaints, in the order that matters: close the
 * resolutions whose window has passed, flag what missed a target, tell the
 * people who should know, and sweep abandoned journeys (with their files).
 */

import type { AuditExecutor } from "@/lib/db/audit";
import type { Storage } from "@/lib/storage";
import { closeLapsedResolutions, escalateOverdue } from "./escalation";
import { sendEscalationDigests } from "./notify";
import { sweepExpiredJourneys } from "./public/store";

export interface DailyResult {
  closed: number;
  escalated: number;
  emailed: number;
  journeysSwept: number;
}

export async function runComplaintsDaily(
  db: AuditExecutor,
  now: Date,
  opts: { origin: string; getStorage?: () => Storage },
): Promise<DailyResult> {
  const closed = await closeLapsedResolutions(db, now);
  const escalated = await escalateOverdue(db, now);
  const emailed = await sendEscalationDigests(db, escalated, `${opts.origin}/admin/cases?overdue=1`);
  const journeysSwept = await sweepExpiredJourneys(db, now, opts.getStorage);
  return { closed: closed.length, escalated: escalated.length, emailed, journeysSwept };
}
