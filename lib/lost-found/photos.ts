/**
 * Private photos of a found item, kept for the case (never linked from a
 * public page). Stored through lib/storage with `private` visibility under an
 * unguessable key, recorded as `case_attachments`, and deleted by retention
 * with the case. Showing one to staff uses a short-lived signed URL.
 */

import { asc, eq } from "drizzle-orm";
import { assertStaff, appendEvent, auditContextOf, lockCase, touchCase } from "@/lib/cases/internal";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseAttachments } from "@/lib/db/schema/cases";
import { newObjectKey, StorageError, validateUpload, type Storage } from "@/lib/storage";

/** Largest photo accepted at the desk after the browser has compressed it. */
export const MAX_CASE_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_CASE_PHOTOS = 10;

export type PhotoFailure = "empty" | "too_large" | "unsupported_type" | "type_mismatch" | "too_many" | "not_configured" | "failed";

export type AddPhotoResult = { ok: true; id: string; storageKey: string } | { ok: false; reason: PhotoFailure };

/** Validates and stores one photo privately for a case. */
export async function addPrivatePhoto(
  db: AuditExecutor,
  caseId: string,
  file: { bytes: Uint8Array; declaredType?: string },
  actor: StaffActor,
  opts: { storage: () => Storage; now?: Date },
): Promise<AddPhotoResult> {
  const now = opts.now ?? new Date();
  const check = validateUpload(file.bytes, "image", file.declaredType);
  if (!check.ok) return { ok: false, reason: check.code };

  const existing = await db.select({ id: caseAttachments.id }).from(caseAttachments).where(eq(caseAttachments.caseId, caseId));
  if (existing.length >= MAX_CASE_PHOTOS) return { ok: false, reason: "too_many" };

  let storage: Storage;
  try {
    storage = opts.storage();
  } catch {
    return { ok: false, reason: "not_configured" };
  }
  const key = newObjectKey("lf/items", check.extension);
  try {
    await storage.put(key, file.bytes, { visibility: "private", contentType: check.contentType, maxBytes: MAX_CASE_PHOTO_BYTES });
  } catch (error) {
    if (error instanceof StorageError && error.code === "too_large") return { ok: false, reason: "too_large" };
    console.error("[lost-found] photo upload failed", error);
    return { ok: false, reason: "failed" };
  }
  try {
    const id = await withAudit(db, auditContextOf(actor), async (tx, audit) => {
      const row = await lockCase(tx, caseId);
      assertStaff(actor, row.service);
      if (row.piiDeletedAt) throw new CaseError("pii_deleted", "Personal data for this case has been deleted.");
      const [created] = await tx
        .insert(caseAttachments)
        .values({ caseId, storageKey: key, contentType: check.contentType, size: check.size, uploadedBy: actor.userId, createdAt: now })
        .returning({ id: caseAttachments.id });
      await appendEvent(tx, caseId, actor, now, { type: "attachment_added", metadata: { attachmentId: created!.id } });
      await touchCase(tx, caseId, actor, now);
      await audit({ action: "lost_found.photo_add", entityType: "case", entityId: caseId, after: { attachmentId: created!.id } });
      return created!.id;
    });
    return { ok: true, id, storageKey: key };
  } catch (error) {
    await storage.delete(key).catch(() => undefined);
    throw error;
  }
}

export interface CasePhoto {
  id: string;
  /** Short-lived signed URL, or null when storage cannot be reached. */
  url: string | null;
}

/** The case's private photos, oldest first, each with a signed URL. */
export async function listPrivatePhotos(db: AuditExecutor, caseId: string, storage: () => Storage): Promise<CasePhoto[]> {
  const rows = await db.select().from(caseAttachments).where(eq(caseAttachments.caseId, caseId)).orderBy(asc(caseAttachments.createdAt));
  if (rows.length === 0) return [];
  let store: Storage | null = null;
  try {
    store = storage();
  } catch {
    store = null;
  }
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      url: store ? await store.signedReadUrl(r.storageKey, { expiresInSeconds: 600 }).catch(() => null) : null,
    })),
  );
}

export async function countPrivatePhotos(db: AuditExecutor, caseId: string): Promise<number> {
  const rows = await db.select({ id: caseAttachments.id }).from(caseAttachments).where(eq(caseAttachments.caseId, caseId));
  return rows.length;
}
