/**
 * The daily jobs for complaints (run by /api/cron/complaints, see vercel.json):
 *
 *   closeLapsedResolutions  a resolved complaint whose reopen window has passed
 *                           becomes `closed`, and the one year clock restarts
 *                           from that closure
 *   escalateOverdue         an open complaint past its acknowledge target (and
 *                           not yet acknowledged) or its resolve target is
 *                           flagged `escalated`, with an internal event
 *
 * Neither is a status change by a person, so the engine's `transition` (which
 * refuses the system actor) is not used: the same rows are written here under
 * one lock, event and audit entry per complaint. A failure for one complaint
 * is logged and the rest go on; the next run tries it again.
 */

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { addOneYear, appendEvent, lockCase } from "@/lib/cases/internal";
import { publicStatusLabel } from "@/lib/cases/services";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories } from "@/lib/db/schema/complaints";
import { REOPEN_WINDOW_DAYS } from "./constants";
import type { EscalatedItem } from "./notify";

const DAY_MS = 24 * 60 * 60 * 1000;
const SYSTEM = { kind: "system" } as const;

/** Closes resolved complaints older than the reopen window. Returns the references closed. */
export async function closeLapsedResolutions(db: AuditExecutor, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - REOPEN_WINDOW_DAYS * DAY_MS);
  const due = await db
    .select({ caseId: complaintCases.caseId })
    .from(complaintCases)
    .innerJoin(cases, eq(cases.id, complaintCases.caseId))
    .where(and(eq(cases.status, "resolved"), lte(complaintCases.resolvedAt, cutoff)))
    .limit(500);
  const closed: string[] = [];
  for (const { caseId } of due) {
    try {
      const reference = await withAudit(db, { actorUserId: null }, async (tx, audit) => {
        const row = await lockCase(tx, caseId);
        if (row.status !== "resolved") return null;
        await tx.update(cases).set({ status: "closed", closedAt: now, piiDeleteAfter: addOneYear(now), updatedAt: now }).where(eq(cases.id, caseId));
        await appendEvent(tx, caseId, SYSTEM, now, {
          type: "status_changed",
          visibility: publicStatusLabel("complaint", "complaint", "closed") ? "public" : "internal",
          fromStatus: "resolved",
          toStatus: "closed",
          metadata: { auto: true },
        });
        await audit({ action: "complaint.auto_close", entityType: "case", entityId: caseId, before: { status: "resolved" }, after: { status: "closed", reopenWindowDays: REOPEN_WINDOW_DAYS } });
        return row.reference;
      });
      if (reference) closed.push(reference);
    } catch (error) {
      console.error(`[complaints] could not close ${caseId}`, error instanceof Error ? error.message : error);
    }
  }
  return closed;
}

/** Flags complaints that missed a target. Returns what was newly escalated, for the notification. */
export async function escalateOverdue(db: AuditExecutor, now: Date): Promise<EscalatedItem[]> {
  const ackMissed = and(isNull(complaintCases.acknowledgedAt), lte(complaintCases.acknowledgeDueAt, now), isNull(complaintCases.escalatedReason));
  const resolveMissed = and(lte(complaintCases.resolveDueAt, now), or(isNull(complaintCases.escalatedReason), eq(complaintCases.escalatedReason, "acknowledge")));
  const candidates = await db
    .select({
      caseId: complaintCases.caseId,
      categoryId: complaintCases.categoryId,
      reference: cases.reference,
      restricted: complaintCategories.restricted,
      resolveMissed: sql<boolean>`${complaintCases.resolveDueAt} <= ${now.toISOString()}::timestamptz`,
    })
    .from(complaintCases)
    .innerJoin(cases, eq(cases.id, complaintCases.caseId))
    .innerJoin(complaintCategories, eq(complaintCategories.id, complaintCases.categoryId))
    .where(and(isNull(cases.closedAt), isNull(cases.piiDeletedAt), or(ackMissed, resolveMissed)))
    .limit(500);

  const escalated: EscalatedItem[] = [];
  for (const c of candidates) {
    const reason = c.resolveMissed ? "resolve" : "acknowledge";
    try {
      const done = await withAudit(db, { actorUserId: null }, async (tx, audit) => {
        const row = await lockCase(tx, c.caseId);
        if (row.closedAt) return false;
        const [cc] = await tx.select().from(complaintCases).where(eq(complaintCases.caseId, c.caseId)).for("update");
        if (!cc || (cc.escalatedReason === "resolve") || (cc.escalatedReason === "acknowledge" && reason === "acknowledge")) return false;
        await tx
          .update(complaintCases)
          .set({ escalatedAt: cc.escalatedAt ?? now, escalatedReason: reason })
          .where(eq(complaintCases.caseId, c.caseId));
        await appendEvent(tx, c.caseId, SYSTEM, now, {
          type: "escalated",
          metadata: { reason, dueAt: (reason === "resolve" ? cc.resolveDueAt : cc.acknowledgeDueAt).toISOString() },
        });
        await audit({ action: "complaint.escalate", entityType: "case", entityId: c.caseId, after: { reason, reference: row.reference } });
        return true;
      });
      if (done) escalated.push({ caseId: c.caseId, reference: c.reference, categoryId: c.categoryId, restricted: c.restricted, reason });
    } catch (error) {
      console.error(`[complaints] could not escalate ${c.reference}`, error instanceof Error ? error.message : error);
    }
  }
  return escalated;
}
