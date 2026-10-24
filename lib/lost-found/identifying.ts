/**
 * The detail only the owner of a lost item would know, given with a lost
 * report (the public journey stores it, lib/lost-found/public). Staff read it
 * to compare with a found item's hidden detail or a claim. Like the other
 * private values it is shown only on a logged "Show": a `verification_viewed`
 * event (internal) and an audit entry in the same transaction.
 */

import { asc, eq } from "drizzle-orm";
import { assertStaff, appendEvent, auditContextOf, lockCase } from "@/lib/cases/internal";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { decryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { lostFoundIdentifyingDetails } from "@/lib/db/schema/lost-found-cases";
import { identifyingDetailAad } from "./public/aad";

/** Whether the lost report holds an identifying detail. Nothing is decrypted. */
export async function hasIdentifyingDetail(db: AuditExecutor, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: lostFoundIdentifyingDetails.id }).from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, caseId)).limit(1);
  return rows.length > 0;
}

/** Decrypts the identifying detail(s) of a lost report for staff. Logged; null, with nothing logged, when there is none. */
export async function readIdentifyingDetail(db: AuditExecutor, lostCaseId: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<string | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, lostCaseId);
    assertStaff(actor, row.service);
    if (row.service !== "lost_found" || row.kind !== "lost") throw new CaseError("invalid", "This is not a lost report.");
    const rows = await tx.select().from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, lostCaseId)).orderBy(asc(lostFoundIdentifyingDetails.createdAt));
    if (rows.length === 0 || row.piiDeletedAt) return null;
    const plain = rows.map((r) => decryptPii(r.detailEnc, identifyingDetailAad(r.id), opts.env)).join("\n\n");
    await appendEvent(tx, lostCaseId, actor, now, { type: "verification_viewed", metadata: { subject: "identifying_detail" } });
    await audit({ action: "lost_found.identifying_view", entityType: "case", entityId: lostCaseId, after: { reference: row.reference } });
    return plain;
  });
}
