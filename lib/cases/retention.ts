/**
 * Retention: personal data is deleted one year after a case closes (backend
 * plan, Privacy). `purgeExpiredPii` finds cases whose `pii_delete_after` has
 * passed, deletes their contacts and attachment objects, revokes their
 * tracking links, sets `pii_deleted_at`, and records an event and an audit
 * entry. Cases, their status history and public updates stay; internal notes
 * stay too, which is why staff are told to keep personal details out of them.
 *
 * Storage objects are removed first, then the database rows in one
 * transaction. If anything fails for a case it is left untouched and tried
 * again on the next run; deleting a missing object is not an error.
 */

import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseAccessTokens, caseAttachments, caseContacts, cases } from "@/lib/db/schema/cases";
import type { Storage } from "@/lib/storage/types";
import { purgeLostFoundPii } from "@/lib/lost-found/retention";
import { appendEvent } from "./internal";

export interface PurgeResult {
  /** Cases whose personal data was deleted. */
  purged: number;
  contacts: number;
  attachments: number;
  /** Cases that failed and will be retried. */
  failed: number;
}

export const PURGE_BATCH = 100;

/**
 * Deletes personal data for up to `PURGE_BATCH` cases past their date.
 * `getStorage` is only called when a case has attachments, so a deployment
 * without file storage can still purge contacts.
 */
export async function purgeExpiredPii(db: AuditExecutor, now: Date, getStorage?: () => Storage): Promise<PurgeResult> {
  const due = await db
    .select({ id: cases.id, reference: cases.reference })
    .from(cases)
    .where(and(isNull(cases.piiDeletedAt), isNotNull(cases.piiDeleteAfter), lte(cases.piiDeleteAfter, now)))
    .orderBy(cases.piiDeleteAfter)
    .limit(PURGE_BATCH);

  const result: PurgeResult = { purged: 0, contacts: 0, attachments: 0, failed: 0 };
  for (const item of due) {
    try {
      const files = await db.select({ key: caseAttachments.storageKey }).from(caseAttachments).where(eq(caseAttachments.caseId, item.id));
      if (files.length > 0) {
        const storage = getStorage?.();
        if (!storage) throw new Error("File storage is not available to delete attachments.");
        for (const file of files) await storage.delete(file.key);
      }
      const counts = await withAudit(db, { actorUserId: null }, async (tx, audit) => {
        const gone = await tx.delete(caseContacts).where(eq(caseContacts.caseId, item.id)).returning({ id: caseContacts.id });
        const objects = await tx.delete(caseAttachments).where(eq(caseAttachments.caseId, item.id)).returning({ id: caseAttachments.id });
        // Other tables keyed by case that hold encrypted personal data (lost and found: hidden detail, claim answers).
        await purgeLostFoundPii(tx, item.id);
        await tx.update(caseAccessTokens).set({ revokedAt: now }).where(and(eq(caseAccessTokens.caseId, item.id), isNull(caseAccessTokens.revokedAt)));
        await tx.update(cases).set({ piiDeletedAt: now }).where(eq(cases.id, item.id));
        await appendEvent(tx, item.id, { kind: "system" }, now, { type: "pii_deleted", metadata: { contacts: gone.length, attachments: objects.length } });
        await audit({
          action: "case.pii_purge",
          entityType: "case",
          entityId: item.id,
          after: { reference: item.reference, contacts: gone.length, attachments: objects.length },
        });
        return { contacts: gone.length, attachments: objects.length };
      });
      result.contacts += counts.contacts;
      result.attachments += counts.attachments;
      result.purged += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[retention] could not purge ${item.reference}`, error);
    }
  }
  return result;
}
