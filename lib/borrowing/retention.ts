/**
 * Retention for the borrowing table that holds personal data.
 * `purgeExpiredPii` (lib/cases/retention.ts) calls this inside the same
 * transaction that deletes the case's contacts, one year after the loan
 * closes. The student number and the affiliation are cleared. What stays holds
 * no personal data: the group, event, venue and purpose, the period, the
 * items and quantities, the deposit kind and count, the condition and
 * compensation, and the dates.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingRequests } from "@/lib/db/schema/borrowing";

export async function purgeBorrowingPii(tx: AuditExecutor, caseId: string): Promise<{ requests: number }> {
  const cleared = await tx
    .update(borrowingRequests)
    .set({ studentIdEnc: null, affiliationEnc: null })
    .where(eq(borrowingRequests.caseId, caseId))
    .returning({ id: borrowingRequests.caseId });
  return { requests: cleared.length };
}
