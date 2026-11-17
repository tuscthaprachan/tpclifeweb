/**
 * The whole daily run for complaints, in the order that matters: close the
 * resolutions whose window has passed, flag what missed a target, tell the
 * people who should know, and sweep abandoned journeys (with their files).
 */

import { inArray } from "drizzle-orm";
import { cases } from "@/lib/db/schema/cases";
import type { AuditExecutor } from "@/lib/db/audit";
import type { Storage } from "@/lib/storage";
import { closeLapsedResolutions, escalateOverdue } from "./escalation";
import { notifyComplainant, sendEscalationDigests, type NotifyOpts } from "./notify";
import { sweepExpiredJourneys } from "./public/store";

export interface DailyResult {
  closed: number;
  escalated: number;
  emailed: number;
  /** Complainants told that their resolved complaint has closed. */
  closedNotified: number;
  journeysSwept: number;
}

export async function runComplaintsDaily(
  db: AuditExecutor,
  now: Date,
  opts: { origin: string; getStorage?: () => Storage } & Pick<NotifyOpts, "sender" | "emailConfigured" | "env"> & { gapMs?: number },
): Promise<DailyResult> {
  const closed = await closeLapsedResolutions(db, now);
  const closedNotified = await tellClosed(db, closed, now, opts);
  const escalated = await escalateOverdue(db, now);
  const emailed = await sendEscalationDigests(db, escalated, `${opts.origin}/admin/cases?overdue=1`, { sender: opts.sender, emailConfigured: opts.emailConfigured, gapMs: opts.gapMs });
  const journeysSwept = await sweepExpiredJourneys(db, now, opts.getStorage);
  return { closed: closed.length, escalated: escalated.length, emailed, closedNotified, journeysSwept };
}

/** One email per closed complaint, one at a time to stay within the email service's rate limit. A complaint with no address, or no consent, is skipped quietly. */
async function tellClosed(db: AuditExecutor, references: string[], now: Date, opts: { gapMs?: number } & NotifyOpts): Promise<number> {
  if (references.length === 0) return 0;
  const rows = await db.select({ id: cases.id }).from(cases).where(inArray(cases.reference, references));
  let sent = 0;
  for (const [index, row] of rows.entries()) {
    const outcome = await notifyComplainant(db, row.id, "closed", { kind: "system" }, { sender: opts.sender, emailConfigured: opts.emailConfigured, env: opts.env, now });
    if (outcome.result === "sent") {
      sent += 1;
      if (index < rows.length - 1) await new Promise((resolve) => setTimeout(resolve, opts.gapMs ?? 600));
    }
  }
  return sent;
}
