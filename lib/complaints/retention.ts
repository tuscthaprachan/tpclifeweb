/**
 * Retention for the complaint tables that hold personal data.
 * `purgeExpiredPii` (lib/cases/retention.ts) calls this inside the same
 * transaction that deletes the case's contacts and attachments, one year after
 * closure. Everything the person wrote is cleared, evidence rows go (their
 * attachments are deleted by the engine, and the rows cascade), and survey
 * comments are cleared. What stays holds no personal data: the category, the
 * identity kind, the due, acknowledged, resolved and escalated dates, and the
 * survey scores, which feed performance reporting.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintCases, complaintEvidence, complaintSurveys } from "@/lib/db/schema/complaints";

export async function purgeComplaintPii(tx: AuditExecutor, caseId: string): Promise<{ complaints: number; evidence: number; comments: number }> {
  const complaints = await tx
    .update(complaintCases)
    .set({ descriptionEnc: null, whenEnc: null, whereEnc: null, remedyEnc: null, reopenReasonEnc: null })
    .where(eq(complaintCases.caseId, caseId))
    .returning({ id: complaintCases.caseId });
  const evidence = await tx.delete(complaintEvidence).where(eq(complaintEvidence.caseId, caseId)).returning({ id: complaintEvidence.id });
  const comments = await tx.update(complaintSurveys).set({ commentEnc: null }).where(eq(complaintSurveys.caseId, caseId)).returning({ id: complaintSurveys.id });
  return { complaints: complaints.length, evidence: evidence.length, comments: comments.length };
}
