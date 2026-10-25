/**
 * Claims on found items, and the officer's review of them.
 *
 * A claim holds the claimant's answer to the verification question, encrypted
 * and bound to the claim row. Staff read it only through `readClaimAnswer`,
 * which records a `claim_viewed` event and an audit entry in the same
 * transaction, as `readVerificationDetail` does for the hidden detail. The
 * officer compares the two on screen and records a decision:
 *
 *   accepted  found item and lost report (if any) go to ready_to_collect
 *   rejected  found item goes back to listed (when no other claim waits) and
 *             the claimant gets a polite message; the link is dismissed
 *
 * The claimant's tracking link shows only their own claim
 * (lib/lost-found/public/claim-view.ts). So the messages for a claim (the
 * rejection, or collection details on acceptance) are public updates tagged
 * with the claim id, which keeps them off the item's general timeline.
 *
 * `createClaim` also accepts the `public` actor, which is how a public claim
 * journey records its submission here. Only staff can move the found item to
 * `claim_pending`, so a public claim leaves the status alone until an officer
 * starts the review (the decision does it if nobody has).
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { addNote, addPublicUpdate } from "@/lib/cases/engine";
import { insertContact, type ContactInput } from "@/lib/cases/contacts";
import { appendEvent, assertStaff, auditContextOf, cleanText, lockCase, touchCase } from "@/lib/cases/internal";
import { isTerminalStatus } from "@/lib/cases/services";
import { CaseError, type BilingualText, type CaseActor, type PublicUpdateText, type StaffActor } from "@/lib/cases/types";
import { decryptPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseContacts } from "@/lib/db/schema/cases";
import { cases } from "@/lib/db/schema";
import { lostFoundCaseLinks, lostFoundClaims, type ClaimDecision } from "@/lib/db/schema/lost-found-staff";
import { advanceTo } from "./common";
import { contentActorOf, expireListing, setListingRegisterStatus } from "./listing";
import { transition } from "@/lib/cases/engine";

export const ANSWER_MAX = 2000;

export function claimAnswerAad(claimId: string): string {
  return `lost_found_claims:answer:${claimId}`;
}

/** Polite text for a rejected claim, used to fill the form. Staff may edit it. */
export const DEFAULT_REJECT_MESSAGE: BilingualText = {
  th: "เรายังยืนยันไม่ได้ว่าของชิ้นนี้เป็นของคุณจากรายละเอียดที่ให้ไว้ ของชิ้นนี้ยังอยู่ในรายการของที่พบ หากมีรายละเอียดเพิ่มเติม โปรดแจ้งหรือแวะมาที่เคาน์เตอร์",
  en: "We could not confirm from the details given that this item is yours. It is still on our list. If you can give more details, please tell us or visit the desk.",
};

export interface NewClaim {
  foundCaseId: string;
  /** The claimant's lost report, if they have one. */
  lostCaseId?: string | null;
  /** What the claimant said about the item. */
  answer: string;
  claimant: Omit<ContactInput, "role">;
}

/** Records a claim: the claimant as an encrypted contact on the found item, and the encrypted answer. Returns the claim id. */
export async function createClaim(db: AuditExecutor, input: NewClaim, actor: CaseActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<string> {
  const now = opts.now ?? new Date();
  const answer = cleanText(input.answer, ANSWER_MAX, "Answer");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, input.foundCaseId);
    if (actor.kind === "staff") assertStaff(actor, row.service);
    if (row.service !== "lost_found" || row.kind !== "found") throw new CaseError("invalid", "A claim is made on a found item.");
    if (row.piiDeletedAt) throw new CaseError("pii_deleted", "Personal data for this case has been deleted.");
    if (isTerminalStatus(row.service, row.kind, row.status) || row.status === "ready_to_collect") throw new CaseError("invalid_transition", "This item can no longer be claimed.");

    const contactId = await insertContact(tx, row.id, { ...input.claimant, role: "claimant" }, actor, now, opts.env);
    const id = crypto.randomUUID();
    await tx.insert(lostFoundClaims).values({
      id,
      caseId: row.id,
      lostCaseId: input.lostCaseId ?? null,
      claimantContactId: contactId,
      answerEnc: encryptPii(answer, claimAnswerAad(id), opts.env),
      createdAt: now,
    });
    await appendEvent(tx, row.id, actor, now, { type: "internal_note", body: "A claim was received. Compare the answer with the hidden detail.", metadata: { claimId: id } });
    await touchCase(tx, row.id, actor, now);
    await audit({ action: "lost_found.claim_create", entityType: "case", entityId: row.id, after: { claimId: id } });
    return id;
  });
}

export interface ClaimSummary {
  id: string;
  createdAt: Date;
  lostCaseId: string | null;
  lostReference: string | null;
  decision: ClaimDecision | null;
  decidedAt: Date | null;
  hasAnswer: boolean;
  /** The claimant's contact is held (details are shown through the logged contact view). */
  hasContact: boolean;
}

/** The claims on a found item, oldest first, with nothing personal in them. */
export async function listClaims(db: AuditExecutor, foundCaseId: string): Promise<ClaimSummary[]> {
  const rows = await db
    .select({ claim: lostFoundClaims, lostReference: cases.reference, contactId: caseContacts.id })
    .from(lostFoundClaims)
    .leftJoin(cases, eq(cases.id, lostFoundClaims.lostCaseId))
    .leftJoin(caseContacts, eq(caseContacts.id, lostFoundClaims.claimantContactId))
    .where(eq(lostFoundClaims.caseId, foundCaseId))
    .orderBy(asc(lostFoundClaims.createdAt));
  return rows.map(({ claim, lostReference, contactId }) => ({
    id: claim.id,
    createdAt: claim.createdAt,
    lostCaseId: claim.lostCaseId,
    lostReference,
    decision: claim.decision as ClaimDecision | null,
    decidedAt: claim.decidedAt,
    hasAnswer: Boolean(claim.answerEnc),
    hasContact: Boolean(contactId),
  }));
}

/** Decrypts a claimant's answer for staff. Logged (event and audit entry) in the same transaction; null, with nothing logged, when it is gone. */
export async function readClaimAnswer(db: AuditExecutor, claimId: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<string | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [claim] = await tx.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
    if (!claim) throw new CaseError("not_found", "Claim not found.");
    const row = await lockCase(tx, claim.caseId);
    assertStaff(actor, row.service);
    if (!claim.answerEnc || row.piiDeletedAt) return null;
    const plain = decryptPii(claim.answerEnc, claimAnswerAad(claim.id), opts.env);
    await appendEvent(tx, row.id, actor, now, { type: "claim_viewed", metadata: { claimId } });
    await audit({ action: "lost_found.claim_view", entityType: "case", entityId: row.id, after: { claimId, reference: row.reference } });
    return plain;
  });
}

export interface DecideInput {
  claimId: string;
  decision: ClaimDecision;
  /** Required to reject: the polite explanation the person sees, in both languages. */
  message?: BilingualText;
  /** Optional on acceptance: where and when to collect, in Thai, English or both. Shown to the claimant only. */
  collectionNote?: PublicUpdateText;
}

export interface DecisionResult {
  foundCaseId: string;
  lostCaseId: string | null;
  foundStatus: string;
  lostStatus: string | null;
}

/** Records the officer's decision on a claim and moves the cases (see the file comment). One transaction. */
export async function decideClaim(db: AuditExecutor, input: DecideInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<DecisionResult> {
  const now = opts.now ?? new Date();
  if (input.decision === "rejected" && (!input.message?.th.trim() || !input.message?.en.trim())) {
    throw new CaseError("invalid", "A rejection needs a message in Thai and English.");
  }
  const result = await db.transaction(async (tx) => {
    const [claim] = await tx.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, input.claimId));
    if (!claim) throw new CaseError("not_found", "Claim not found.");
    const found = await lockCase(tx, claim.caseId);
    assertStaff(actor, found.service);
    if (claim.decision) throw new CaseError("stale", "This claim has already been decided.");
    if (found.kind !== "found") throw new CaseError("invalid", "A claim is made on a found item.");

    // The claimant's lost report: the one named on the claim, else the linked one.
    let lostCaseId = claim.lostCaseId;
    if (!lostCaseId) {
      const links = await tx
        .select()
        .from(lostFoundCaseLinks)
        .where(and(eq(lostFoundCaseLinks.foundCaseId, found.id), eq(lostFoundCaseLinks.status, "possible")));
      if (links.length === 1) lostCaseId = links[0]!.lostCaseId;
    }
    const content = contentActorOf(actor);

    await withAudit(tx, auditContextOf(actor), async (inner, audit) => {
      await inner
        .update(lostFoundClaims)
        .set({ decision: input.decision, decidedBy: actor.userId, decidedAt: now, lostCaseId })
        .where(eq(lostFoundClaims.id, claim.id));
      await audit({ action: "lost_found.claim_decide", entityType: "case", entityId: found.id, after: { claimId: claim.id, decision: input.decision } });
    });

    let foundStatus = found.status;
    let lostStatus: string | null = null;
    if (input.decision === "accepted") {
      await advanceTo(tx, found.id, "ready_to_collect", actor, { now });
      foundStatus = "ready_to_collect";
      if (lostCaseId) {
        await advanceTo(tx, lostCaseId, "ready_to_collect", actor, { now });
        lostStatus = "ready_to_collect";
        await tx
          .update(lostFoundCaseLinks)
          .set({ status: "confirmed", updatedAt: now })
          .where(and(eq(lostFoundCaseLinks.foundCaseId, found.id), eq(lostFoundCaseLinks.lostCaseId, lostCaseId)));
        await addNote(tx, lostCaseId, `Claim accepted for found item ${found.reference}.`, actor, { now });
      }
      if (input.collectionNote?.th?.trim() || input.collectionNote?.en?.trim()) {
        await addPublicUpdate(tx, found.id, input.collectionNote, actor, { now, metadata: { claimId: claim.id } });
      }
      await addNote(tx, found.id, "Claim accepted: the answer matched the hidden detail.", actor, { now });
    } else {
      const message = { th: input.message!.th.trim(), en: input.message!.en.trim() };
      const others = await tx
        .select({ id: lostFoundClaims.id })
        .from(lostFoundClaims)
        .where(and(eq(lostFoundClaims.caseId, found.id), isNull(lostFoundClaims.decision)));
      const otherWaiting = others.some((o) => o.id !== claim.id);
      if (found.status === "claim_pending" && !otherWaiting) {
        await transition(tx, found.id, "listed", actor, { now });
        foundStatus = "listed";
        await setListingRegisterStatus(tx, found.id, "open", content, now);
      }
      // For this claimant only: the item's general timeline does not carry it.
      await addPublicUpdate(tx, found.id, message, actor, { now, metadata: { claimId: claim.id } });
      if (lostCaseId) {
        const [lost] = await tx.select({ status: cases.status }).from(cases).where(eq(cases.id, lostCaseId));
        if (lost?.status === "match_found" || lost?.status === "ready_to_collect") {
          await transition(tx, lostCaseId, "searching", actor, { now, note: message });
          lostStatus = "searching";
        } else {
          await addPublicUpdate(tx, lostCaseId, message, actor, { now });
          lostStatus = lost?.status ?? null;
        }
        await tx
          .update(lostFoundCaseLinks)
          .set({ status: "dismissed", updatedAt: now })
          .where(and(eq(lostFoundCaseLinks.foundCaseId, found.id), eq(lostFoundCaseLinks.lostCaseId, lostCaseId)));
        await setListingRegisterStatus(tx, lostCaseId, "open", content, now);
        await addNote(tx, lostCaseId, `Claim on found item ${found.reference} was not accepted.`, actor, { now });
      }
      await addNote(tx, found.id, "Claim rejected: the answer did not match the hidden detail.", actor, { now });
    }
    return { foundCaseId: found.id, lostCaseId, foundStatus, lostStatus };
  });
  await expireListing(db, result.foundCaseId);
  if (result.lostCaseId) await expireListing(db, result.lostCaseId);
  return result;
}
