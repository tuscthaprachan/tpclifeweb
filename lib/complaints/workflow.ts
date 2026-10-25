/**
 * What staff and the complainant do to a complaint after it is opened. Each
 * function runs in one transaction with its audit entry, and checks access in
 * the data layer through the engine (`assertCaseAccess`, so a restricted
 * category's cases are refused as `not_found` to anyone not named on it).
 *
 * The status machine is the engine's (lib/cases/services.ts); what is added
 * here are the complaint facts a status change carries: when it was
 * acknowledged and resolved, the outcome, the reopen window, the due dates.
 * Do not move a complaint with the engine's `transition` directly: use these.
 */

import { eq, sql } from "drizzle-orm";
import { addPublicUpdate, canSeeCase, transition, type CaseActor, type PublicUpdateText, type StaffActor } from "@/lib/cases";
import { appendEvent, auditContextOf, lockCase, touchCase } from "@/lib/cases/internal";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import { CaseError } from "@/lib/cases/types";
import { encryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases, type ComplaintCaseRow } from "@/lib/db/schema/complaints";
import { complaintTextAad } from "./aad";
import { getCategory } from "./categories";
import { REOPEN_WINDOW_DAYS } from "./constants";
import { ComplaintError } from "./errors";
import { addWorkingDays } from "./working-days";

const DAY_MS = 24 * 60 * 60 * 1000;

async function lockComplaint(tx: AuditExecutor, caseId: string): Promise<ComplaintCaseRow> {
  const [row] = await tx.select().from(complaintCases).where(eq(complaintCases.caseId, caseId)).for("update");
  if (!row) throw new CaseError("not_found", "Case not found.");
  return row;
}

/** True while a resolved complaint may still be reopened by the person. */
export function canReopenNow(resolvedAt: Date | null, status: string, now: Date): boolean {
  return status === "resolved" && resolvedAt !== null && now.getTime() <= resolvedAt.getTime() + REOPEN_WINDOW_DAYS * DAY_MS;
}

export function reopenWindowEnds(resolvedAt: Date): Date {
  return new Date(resolvedAt.getTime() + REOPEN_WINDOW_DAYS * DAY_MS);
}

export interface AcknowledgeInput {
  /** Optional extra words for the person, in either language. The standard acknowledgement is always added. */
  message?: PublicUpdateText;
}

/** The standard acknowledgement. It names the date the person can expect an answer by, so it is written when it is sent. */
export function acknowledgementText(resolveBy: Date): { th: string; en: string } {
  const th = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(resolveBy);
  const en = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(resolveBy);
  return {
    th: `เจ้าหน้าที่ได้รับเรื่องของคุณแล้วและกำลังดูแลอยู่ เราตั้งเป้าแจ้งผลภายในวันที่ ${th}`,
    en: `A member of staff has seen your complaint and is looking after it. We aim to give you an answer by ${en}.`,
  };
}

/**
 * Acknowledges a received complaint: moves it to `acknowledged`, records when,
 * and adds the standard acknowledgement (plus any message) to the public
 * timeline. Telling the person by email is separate (./notify.ts), because it
 * decrypts their address and must be logged as a view.
 */
export async function acknowledgeComplaint(db: AuditExecutor, caseId: string, input: AcknowledgeInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const complaint = await lockComplaint(tx, caseId);
    await transition(tx, caseId, "acknowledged", actor, { expectedFrom: "received", now });
    await tx.update(complaintCases).set({ acknowledgedAt: now }).where(eq(complaintCases.caseId, caseId));
    const standard = acknowledgementText(complaint.resolveDueAt);
    const extra = { th: input.message?.th?.trim() ?? "", en: input.message?.en?.trim() ?? "" };
    await addPublicUpdate(
      tx,
      caseId,
      { th: [standard.th, extra.th].filter(Boolean).join("\n\n"), en: [standard.en, extra.en].filter(Boolean).join("\n\n") },
      actor,
      { now },
    );
  });
}

/** Moves a complaint into `in_progress` (from received, acknowledged or reopened), acknowledging it implicitly if nobody has. */
export async function startComplaint(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    await transition(tx, caseId, "in_progress", actor, { expectedFrom: row.status, now });
    await tx.execute(sql`update ${complaintCases} set acknowledged_at = coalesce(acknowledged_at, ${now.toISOString()}::timestamptz) where case_id = ${caseId}`);
  });
}

export interface ResolveInput {
  /** The outcome the person reads, in Thai, English or both (at least one). */
  outcome: PublicUpdateText;
}

/** Resolves a complaint: status `resolved`, the outcome on the timeline for the person, and the resolution date. */
export async function resolveComplaint(db: AuditExecutor, caseId: string, input: ResolveInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  const th = input.outcome.th?.trim() ?? "";
  const en = input.outcome.en?.trim() ?? "";
  if (!th && !en) throw new CaseError("invalid", "The outcome is empty. Write it in Thai, English or both.");
  if ([...th].length > 4000 || [...en].length > 4000) throw new CaseError("invalid", "The outcome is too long.");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    await lockComplaint(tx, caseId);
    await transition(tx, caseId, "resolved", actor, { expectedFrom: row.status, now });
    await tx.execute(sql`update ${complaintCases} set resolved_at = ${now.toISOString()}::timestamptz, acknowledged_at = coalesce(acknowledged_at, ${now.toISOString()}::timestamptz) where case_id = ${caseId}`);
    const eventId = await appendEvent(tx, caseId, actor, now, { type: "resolution", visibility: "public", bodyTh: th || null, bodyEn: en || null });
    await audit({ action: "complaint.resolve", entityType: "case", entityId: caseId, after: { eventId, languages: [th ? "th" : null, en ? "en" : null].filter(Boolean) } });
  });
}

/** Closes a resolved complaint early. Final: the person can no longer reopen it. */
export async function closeComplaint(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    await transition(tx, caseId, "closed", actor, { expectedFrom: row.status, now });
  });
}

export interface ReopenInput {
  /** Why it is not resolved, in the person's words. Encrypted. */
  reason?: string | null;
}

/**
 * Reopens a resolved complaint. The person (a `public` actor who has resolved
 * their tracking link) may do it only inside the reopen window; staff may do it
 * for them any time while it is still `resolved`. The resolve target restarts
 * from now, escalation is cleared, and the one year clock stops.
 */
export async function reopenComplaint(db: AuditExecutor, caseId: string, input: ReopenInput, actor: CaseActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  const reason = input.reason?.trim() || null;
  if (reason && [...reason].length > 1000) throw new CaseError("invalid", "The reason is too long.");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (actor.kind === "staff") await assertCaseAccess(tx, row, actor);
    else if (actor.kind !== "public") throw new CaseError("forbidden", "Only staff or the person concerned can reopen a complaint.");
    const complaint = await lockComplaint(tx, caseId);
    if (actor.kind === "public" && !canReopenNow(complaint.resolvedAt, row.status, now)) {
      throw new ComplaintError(row.status === "resolved" ? "window_closed" : "invalid", "This complaint can no longer be reopened.");
    }
    const category = await getCategory(tx, complaint.categoryId);
    await transition(tx, caseId, "reopened", actor, { expectedFrom: "resolved", now });
    await tx
      .update(complaintCases)
      .set({
        resolvedAt: null,
        reopenCount: complaint.reopenCount + 1,
        reopenReasonEnc: encryptOptionalPii(reason, complaintTextAad(caseId, "reopen_reason"), opts.env),
        resolveDueAt: addWorkingDays(now, category?.resolveDays ?? 10),
        escalatedAt: null,
        escalatedReason: null,
      })
      .where(eq(complaintCases.caseId, caseId));
    await audit({ action: "complaint.reopen", entityType: "case", entityId: caseId, after: { round: complaint.reopenCount + 1, reasonGiven: Boolean(reason), by: actor.kind } });
  });
}

export interface RecategoriseResult {
  /** False when the move put the complaint out of this member of staff's sight (into a restricted category they are not named on). */
  stillVisible: boolean;
  /** True when someone else's assignment was cleared because they cannot see it in the new category. */
  unassigned: boolean;
}

/**
 * Changes a complaint's category. The targets are recalculated from when the
 * complaint was received, so moving it does not give it a longer clock.
 * Moving it OUT of a restricted category exposes it to every handler, so it
 * needs `confirmUnrestrict`; moving it INTO one is always allowed (a handler
 * who sees something sensitive must be able to hand it on), after which only
 * the people named on the new category can see it, and an assignee who is not
 * named is cleared. Audited with whether the restriction changed.
 */
export async function recategoriseComplaint(
  db: AuditExecutor,
  caseId: string,
  categoryId: string,
  actor: StaffActor,
  opts: { now?: Date; confirmUnrestrict?: boolean } = {},
): Promise<RecategoriseResult> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const complaint = await lockComplaint(tx, caseId);
    if (complaint.categoryId === categoryId) return { stillVisible: true, unassigned: false };
    const [from, to] = await Promise.all([getCategory(tx, complaint.categoryId), getCategory(tx, categoryId)]);
    if (!to || !to.active) throw new ComplaintError("invalid", "Unknown complaint category.");
    if (from?.restricted && !to.restricted && !opts.confirmUnrestrict) {
      throw new ComplaintError("needs_confirm", "Moving a complaint out of a restricted category makes it visible to every complaints handler.");
    }
    await tx
      .update(complaintCases)
      .set({
        categoryId,
        acknowledgeDueAt: addWorkingDays(row.createdAt, to.acknowledgeDays),
        ...(complaint.reopenCount === 0 ? { resolveDueAt: addWorkingDays(row.createdAt, to.resolveDays) } : {}),
      })
      .where(eq(complaintCases.caseId, caseId));
    await touchCase(tx, caseId, actor, now, { subtype: to.key, summary: `Complaint: ${to.nameEn}` });
    let unassigned = false;
    if (row.assignedTo && !(await canSeeCase(tx, caseId, row.assignedTo))) {
      await tx.update(cases).set({ assignedTo: null }).where(eq(cases.id, caseId));
      unassigned = true;
    }
    await appendEvent(tx, caseId, actor, now, { type: "recategorised", metadata: { from: from?.key ?? null, to: to.key, restrictedFrom: Boolean(from?.restricted), restrictedTo: to.restricted, unassigned } });
    await audit({
      action: "complaint.recategorise",
      entityType: "case",
      entityId: caseId,
      before: { category: from?.key ?? null, restricted: Boolean(from?.restricted) },
      after: { category: to.key, restricted: to.restricted, unassigned },
    });
    return { stillVisible: await canSeeCase(tx, caseId, actor.userId), unassigned };
  });
}

/** Records that the person was pointed to the TU wellbeing centre. Idempotent: the first time only. */
export async function routeToWellbeing(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<boolean> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const complaint = await lockComplaint(tx, caseId);
    if (complaint.wellbeingRoutedAt) return false;
    await tx.update(complaintCases).set({ wellbeingRoutedAt: now }).where(eq(complaintCases.caseId, caseId));
    await touchCase(tx, caseId, actor, now);
    await appendEvent(tx, caseId, actor, now, { type: "wellbeing_routed" });
    await audit({ action: "complaint.wellbeing_route", entityType: "case", entityId: caseId });
    return true;
  });
}
