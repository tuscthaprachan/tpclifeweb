import "server-only";

import { inArray } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { images, type ImageRow } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { lsOpt } from "./map";
import type { ContentImage } from "./types";

/**
 * The public URL for an image's storage key, or null when file storage is not
 * configured (no `BLOB_READ_WRITE_TOKEN`). Callers treat null as "no picture":
 * a missing image degrades to not shown instead of failing the page.
 */
export function publicImageUrl(storageKey: string): string | null {
  try {
    return getStorage().publicUrl(storageKey);
  } catch {
    return null;
  }
}

/** An `images` row as the contract's `ContentImage`, or undefined if it has no usable URL. */
export function toContentImage(row: ImageRow | null | undefined): ContentImage | undefined {
  if (!row) return undefined;
  const url = publicImageUrl(row.storageKey);
  if (!url) return undefined;
  const alt = lsOpt(row.altTh, row.altEn);
  const caption = lsOpt(row.captionTh, row.captionEn);
  return {
    id: row.id,
    url,
    ...(row.width ? { width: row.width } : {}),
    ...(row.height ? { height: row.height } : {}),
    ...(alt ? { alt } : {}),
    ...(row.isDecorative ? { isDecorative: true } : {}),
    ...(caption ? { caption } : {}),
  };
}

/** Fetches image rows by id, as a map. Missing ids are simply absent. */
export async function loadImages(db: AuditExecutor, ids: readonly (string | null | undefined)[]): Promise<Map<string, ContentImage>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const out = new Map<string, ContentImage>();
  if (wanted.length === 0) return out;
  const rows = await db.select().from(images).where(inArray(images.id, wanted));
  for (const row of rows) {
    const image = toContentImage(row);
    if (image) out.set(row.id, image);
  }
  return out;
}

