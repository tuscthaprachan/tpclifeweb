import "server-only";

import { get, list } from "@vercel/blob";
import { eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { openDataDocuments } from "@/lib/db/schema";
import type { LocalDiskStorage } from "@/lib/storage/local-disk";
import type { Visibility } from "@/lib/storage/types";

const MAX_BYTES = 1024 * 1024 * 1024;

export interface ImportBatchResult {
  copied: number;
  skipped: number;
  failed: { key: string; error: string }[];
  cursor: string | null;
  done: boolean;
  openDataLinksUpdated?: number;
}

async function fetchBlob(pathname: string, token: string): Promise<{ bytes: Uint8Array; contentType: string; visibility: Visibility } | null> {
  for (const access of ["private", "public"] as const) {
    const result = await get(pathname, { access, token }).catch(() => null);
    if (result && result.statusCode === 200) {
      const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
      return { bytes, contentType: result.blob.contentType, visibility: access };
    }
  }
  return null;
}

export async function importBlobBatch(storage: LocalDiskStorage, token: string, cursor: string | undefined, limit = 50): Promise<ImportBatchResult> {
  const page = await list({ token, cursor, limit });
  const result: ImportBatchResult = { copied: 0, skipped: 0, failed: [], cursor: page.hasMore ? (page.cursor ?? null) : null, done: !page.hasMore };
  for (const blob of page.blobs) {
    const key = blob.pathname;
    try {
      if (await storage.exists(key)) {
        result.skipped++;
        continue;
      }
      const fetched = await fetchBlob(key, token);
      if (!fetched) throw new Error("not readable");
      await storage.put(key, fetched.bytes, { visibility: fetched.visibility, contentType: fetched.contentType, maxBytes: MAX_BYTES });
      result.copied++;
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (result.done) result.openDataLinksUpdated = await relinkOpenData(storage);
  return result;
}

export async function relinkOpenData(storage: LocalDiskStorage): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: openDataDocuments.id, fileKey: openDataDocuments.fileKey }).from(openDataDocuments).where(isNotNull(openDataDocuments.fileKey));
  let updated = 0;
  for (const row of rows) {
    if (!row.fileKey || !(await storage.exists(row.fileKey))) continue;
    await db.update(openDataDocuments).set({ fileUrl: storage.publicUrl(row.fileKey) }).where(eq(openDataDocuments.id, row.id));
    updated++;
  }
  return updated;
}
