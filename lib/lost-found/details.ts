/**
 * Found item details that are not part of the case row: where the item is
 * held, and the hidden verification detail.
 *
 * The verification detail (what only the owner would know: "scratch on the
 * lid", "photo of a cat on the lock screen") is encrypted with
 * lib/crypto/pii.ts, bound to its case, and never leaves the database except
 * through `readVerificationDetail`, which records a `verification_viewed`
 * event and an audit entry in the same transaction. It is deleted by
 * retention with the case's other personal data.
 */

import { eq } from "drizzle-orm";
import { decryptPii, encryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { assertStaff, appendEvent, auditContextOf, cleanText, lockCase, touchCase } from "@/lib/cases/internal";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { organisations } from "@/lib/db/schema";
import { lostFoundCaseDetails } from "@/lib/db/schema/lost-found-staff";
import { contentActorOf, updateListingForCase } from "./listing";

export const SHELF_MAX = 120;
export const VERIFICATION_MAX = 2000;

export function verificationAad(caseId: string): string {
  return `lost_found_case_details:verification:${caseId}`;
}

export interface CaseDetails {
  storageOrganisationId: number | null;
  storageShelf: string | null;
  hasVerificationDetail: boolean;
}

async function lockFound(tx: AuditExecutor, caseId: string, actor: StaffActor) {
  const row = await lockCase(tx, caseId);
  assertStaff(actor, row.service);
  if (row.service !== "lost_found" || row.kind !== "found") throw new CaseError("invalid", "This is not a found item.");
  return row;
}

/** What is held for a found item, without anything encrypted. */
export async function getCaseDetails(db: AuditExecutor, caseId: string): Promise<CaseDetails> {
  const [row] = await db.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, caseId));
  return {
    storageOrganisationId: row?.storageOrganisationId ?? null,
    storageShelf: row?.storageShelf ?? null,
    hasVerificationDetail: Boolean(row?.verificationDetailEnc),
  };
}

/** Creates the details row for a new found item case, inside the caller's transaction. */
export async function initCaseDetails(tx: AuditExecutor, caseId: string, storageOrganisationId: number | null, now: Date): Promise<void> {
  await tx.insert(lostFoundCaseDetails).values({ caseId, storageOrganisationId, createdAt: now, updatedAt: now }).onConflictDoNothing();
}

/**
 * Records which desk holds the item and where. Also makes that desk the case's
 * owning organisation and updates the listing's public "held at" line (the
 * desk only: the shelf is internal).
 */
export async function saveStorageLocation(
  db: AuditExecutor,
  caseId: string,
  input: { organisationId: number; shelf: string },
  actor: StaffActor,
  opts: { now?: Date } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
  const shelf = cleanText(input.shelf, SHELF_MAX, "Shelf or box");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    await lockFound(tx, caseId, actor);
    const [org] = await tx.select().from(organisations).where(eq(organisations.id, input.organisationId));
    if (!org) throw new CaseError("invalid", "Unknown desk.");
    await tx
      .insert(lostFoundCaseDetails)
      .values({ caseId, storageOrganisationId: org.id, storageShelf: shelf, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: lostFoundCaseDetails.caseId, set: { storageOrganisationId: org.id, storageShelf: shelf, updatedAt: now } });
    await touchCase(tx, caseId, actor, now, { owningOrganisationId: org.id });
    await updateListingForCase(tx, caseId, { heldAt: { th: `เคาน์เตอร์${org.nameTh}`, en: `${org.nameEn} desk` } }, contentActorOf(actor), now);
    await audit({ action: "lost_found.storage_set", entityType: "case", entityId: caseId, after: { organisationId: org.id, shelf } });
  });
}

/** Stores (or replaces) the hidden verification detail, encrypted. Throws `PiiUnavailableError` without a key; nothing is stored then. */
export async function saveVerificationDetail(db: AuditExecutor, caseId: string, detail: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  const text = cleanText(detail, VERIFICATION_MAX, "Verification detail");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockFound(tx, caseId, actor);
    if (row.piiDeletedAt) throw new CaseError("pii_deleted", "Personal data for this case has been deleted.");
    const enc = encryptOptionalPii(text, verificationAad(caseId), opts.env);
    await tx
      .insert(lostFoundCaseDetails)
      .values({ caseId, verificationDetailEnc: enc, verificationUpdatedAt: now, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: lostFoundCaseDetails.caseId, set: { verificationDetailEnc: enc, verificationUpdatedAt: now, updatedAt: now } });
    await touchCase(tx, caseId, actor, now);
    // The audit entry says the detail changed, never what it is.
    await audit({ action: "lost_found.verification_set", entityType: "case", entityId: caseId });
  });
}

/**
 * Decrypts the hidden verification detail for a member of staff. The view is
 * logged (case event plus audit entry) in the same transaction, so nothing is
 * shown without a record. Returns null, logging nothing, when there is none.
 */
export async function readVerificationDetail(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<string | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockFound(tx, caseId, actor);
    const [details] = await tx.select().from(lostFoundCaseDetails).where(eq(lostFoundCaseDetails.caseId, caseId));
    if (!details?.verificationDetailEnc || row.piiDeletedAt) return null;
    const plain = decryptPii(details.verificationDetailEnc, verificationAad(caseId), opts.env);
    await appendEvent(tx, caseId, actor, now, { type: "verification_viewed" });
    await audit({ action: "lost_found.verification_view", entityType: "case", entityId: caseId, after: { reference: row.reference } });
    return plain;
  });
}
