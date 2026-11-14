import { eq } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { images, type ImageRow } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { getStorage, newObjectKey, StorageError, validateUpload } from "@/lib/storage";
import { readImageDimensions } from "./dimensions";

export type ReplaceResult = { ok: true; image: ImageRow; oldKey: string } | { ok: false; error: string };

/**
 * Swaps the file behind a picture and keeps its id, so every page, cover and
 * rich text block that uses it shows the new file. The description is kept.
 * The new file is stored first; only after the row points at it is the old file
 * deleted, and if the row cannot be updated the new file is removed instead.
 */
export async function replaceImageFile(input: {
  db: AuditExecutor;
  actor: ContentActor;
  id: string;
  file: File | null;
  locale: Locale;
}): Promise<ReplaceResult> {
  const { db, actor, id, file, locale } = input;
  const fail = (key: AdminKey): ReplaceResult => ({ ok: false, error: a(key, locale) });

  if (!file || file.size === 0) return fail("errUploadChoose");
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) return fail("errUploadTooLarge");
  const [before] = await db.select().from(images).where(eq(images.id, id));
  if (!before) return fail("errNotFound");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(bytes, "image", file.type);
  if (!check.ok) return fail(check.code === "too_large" ? "errUploadTooLarge" : "errUploadType");

  let storage;
  try {
    storage = getStorage();
  } catch {
    return fail("errStorageNotConfigured");
  }

  const key = newObjectKey("content/images", check.extension);
  try {
    await storage.put(key, bytes, { visibility: "public", contentType: check.contentType, maxBytes: ADMIN_UPLOAD_MAX_BYTES });
  } catch (error) {
    if (error instanceof StorageError && error.code === "too_large") return fail("errUploadTooLarge");
    console.error("[media] replacement upload failed", error);
    return fail("errUploadFailed");
  }

  const size = readImageDimensions(bytes, check.contentType);
  let after: ImageRow | null;
  try {
    after = await withAudit(db, actor.context, async (tx, audit) => {
      const [current] = await tx.select().from(images).where(eq(images.id, id));
      if (!current) return null;
      const [updated] = await tx
        .update(images)
        .set({ storageKey: key, mimeType: check.contentType, width: size?.width ?? null, height: size?.height ?? null })
        .where(eq(images.id, id))
        .returning();
      await audit({ action: "images.replace", entityType: "images", entityId: id, before: current, after: updated });
      return updated!;
    });
  } catch (error) {
    await storage.delete(key).catch(() => undefined);
    throw error;
  }
  if (!after) {
    await storage.delete(key).catch(() => undefined);
    return fail("errNotFound");
  }

  try {
    await storage.delete(before.storageKey);
  } catch (error) {
    console.error("[media] old image file not removed", error);
  }
  return { ok: true, image: after, oldKey: before.storageKey };
}
