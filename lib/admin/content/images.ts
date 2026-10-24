import "server-only";

import { desc, inArray } from "drizzle-orm";
import { publicImageUrl } from "@/lib/content/images";
import { revalidateFor } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { images } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { getStorage, newObjectKey, StorageError, validateUpload } from "@/lib/storage";
import type { ContentActor } from "./access";
import { ADMIN_UPLOAD_MAX_BYTES } from "./upload-limit";

/** What the image picker needs to show and choose a picture. */
export interface ImageChoice {
  id: string;
  /** Null when file storage is not configured, so no thumbnail can be shown. */
  url: string | null;
  altTh: string;
  altEn: string;
  isDecorative: boolean;
}

export { ADMIN_UPLOAD_MAX_BYTES };

/** False when neither `BLOB_READ_WRITE_TOKEN` nor `BLOB_STORE_ID` is set. */
export function isStorageConfigured(): boolean {
  try {
    getStorage();
    return true;
  } catch {
    return false;
  }
}

/** The newest 300 pictures, for pickers. */
export async function listImageChoices(db: AuditExecutor = getDb()): Promise<ImageChoice[]> {
  const rows = await db.select().from(images).orderBy(desc(images.createdAt)).limit(300);
  return rows.map((r) => ({
    id: r.id,
    url: publicImageUrl(r.storageKey),
    altTh: r.altTh,
    altEn: r.altEn,
    isDecorative: r.isDecorative,
  }));
}

export type UploadResult = { ok: true; image: ImageChoice } | { ok: false; error: string };

/**
 * Validates, stores (public) and records one uploaded picture. Alt text in
 * both languages is required unless the picture is decorative (WCAG 1.1.1).
 * Errors come back as messages in `locale`.
 */
export async function uploadContentImage(input: {
  file: File | null;
  altTh: string;
  altEn: string;
  isDecorative: boolean;
  actor: ContentActor;
  locale: Locale;
  db?: AuditExecutor;
}): Promise<UploadResult> {
  const { file, actor, locale } = input;
  const fail = (key: Parameters<typeof a>[0]): UploadResult => ({ ok: false, error: a(key, locale) });

  if (!file || file.size === 0) return fail("errUploadChoose");
  if (!input.isDecorative && (!input.altTh.trim() || !input.altEn.trim())) return fail("errUploadAlt");
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) return fail("errUploadTooLarge");

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
    console.error("[content] image upload failed", error);
    return fail("errUploadFailed");
  }

  const db = input.db ?? getDb();
  const row = await withAudit(db, actor.context, async (tx, audit) => {
    const [created] = await tx
      .insert(images)
      .values({
        storageKey: key,
        mimeType: check.contentType,
        altTh: input.isDecorative ? "" : input.altTh.trim(),
        altEn: input.isDecorative ? "" : input.altEn.trim(),
        isDecorative: input.isDecorative,
        createdBy: actor.userId,
      })
      .returning();
    await audit({ action: "images.create", entityType: "images", entityId: created!.id, after: created });
    return created!;
  });
  revalidateFor("image");

  return {
    ok: true,
    image: { id: row.id, url: publicImageUrl(row.storageKey), altTh: row.altTh, altEn: row.altEn, isDecorative: row.isDecorative },
  };
}

/**
 * For the publish rule: ids that do not exist, and ids of pictures with no
 * alt text in both languages that are not marked decorative (WCAG 1.1.1).
 */
export async function checkImages(db: AuditExecutor, ids: readonly string[]): Promise<{ missing: string[]; undescribed: string[] }> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return { missing: [], undescribed: [] };
  const rows = await db.select().from(images).where(inArray(images.id, wanted));
  const found = new Set(rows.map((r) => r.id));
  return {
    missing: wanted.filter((id) => !found.has(id)),
    undescribed: rows.filter((r) => !r.isDecorative && (!r.altTh.trim() || !r.altEn.trim())).map((r) => r.id),
  };
}
