/**
 * Retention for the lost and found tables that hold encrypted personal data.
 * `purgeExpiredPii` (lib/cases/retention.ts) calls this inside the same
 * transaction that deletes the case's contacts, so the hidden verification
 * detail and the claimants' answers go with them. Where an item is stored,
 * decisions and handover facts (no names, no ID detail) stay as history.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundCaseDetails, lostFoundClaims } from "@/lib/db/schema/lost-found-staff";

export async function purgeLostFoundPii(tx: AuditExecutor, caseId: string): Promise<{ details: number; answers: number }> {
  const details = await tx
    .update(lostFoundCaseDetails)
    .set({ verificationDetailEnc: null })
    .where(eq(lostFoundCaseDetails.caseId, caseId))
    .returning({ id: lostFoundCaseDetails.caseId });
  const answers = await tx.update(lostFoundClaims).set({ answerEnc: null }).where(eq(lostFoundClaims.caseId, caseId)).returning({ id: lostFoundClaims.id });
  return { details: details.length, answers: answers.length };
}
