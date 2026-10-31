import "server-only";

import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { getStorage, newObjectKey, StorageError, validateUpload, type SniffedType } from "@/lib/storage";

export type StoredDocumentFile =
  | { ok: true; key: string; url: string | null; bytes: number; contentType: string }
  | { ok: false; error: string };

/**
 * Checks an uploaded original against the public `document` profile (PDF or CSV,
 * sniffed from its bytes, never the declared type) and stores it as a public
 * object. The console's upload limit applies: the Server Action body cannot exceed it.
 */
export async function storeDocumentFile(input: { file: File; owner: string; locale: Locale }): Promise<StoredDocumentFile> {
  const { file, owner, locale } = input;
  const fail = (key: Parameters<typeof a>[0]): StoredDocumentFile => ({ ok: false, error: a(key, locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 }) });
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) return fail("odmErrFileTooLarge");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(bytes, "document", file.type);
  if (!check.ok) return fail(check.code === "too_large" ? "odmErrFileTooLarge" : "odmErrFileType");

  let storage;
  try {
    storage = getStorage();
  } catch {
    return fail("errStorageNotConfigured");
  }
  const key = newObjectKey(`open-data/${owner}`, check.extension);
  try {
    const stored = await storage.put(key, bytes, { visibility: "public", contentType: check.contentType satisfies SniffedType, maxBytes: ADMIN_UPLOAD_MAX_BYTES });
    return { ok: true, key: stored.key, url: stored.url ?? null, bytes: stored.size, contentType: stored.contentType };
  } catch (error) {
    if (error instanceof StorageError && error.code === "too_large") return fail("odmErrFileTooLarge");
    console.error("[open-data] file upload failed", error);
    return fail("errUploadFailed");
  }
}

/** Removes a stored original that no row points at any more. A stray file does no harm, so a failure is only logged. */
export async function discardStoredFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch (error) {
    console.error("[open-data] stored file not removed", error);
  }
}
