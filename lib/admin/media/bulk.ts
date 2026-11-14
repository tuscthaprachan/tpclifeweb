import { eq, inArray } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { images, type ImageRow } from "@/lib/db/schema";
import { scanImageUsage, type ImageUse } from "./usage";

/** Pictures one bulk request may touch. */
export const MEDIA_BULK_LIMIT = 100;

/** The valid, distinct picture ids from a form, capped at `MEDIA_BULK_LIMIT`. */
export function parseImageIds(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && isUuid(v)))].slice(0, MEDIA_BULK_LIMIT);
}

export interface AltEdit {
  id: string;
  altTh: string;
  altEn: string;
  isDecorative: boolean;
}

export interface BulkAltResult {
  updated: string[];
  /** Pictures left unchanged: gone, or not described in both languages and not decorative. */
  failed: { id: string; reason: "notFound" | "missingAlt" }[];
}

/**
 * Sets the description of several pictures at once. Each picture follows the
 * single edit rule (both languages unless decorative, WCAG 1.1.1); one that
 * fails is skipped and reported, the rest are saved. One audit entry each.
 */
export async function bulkUpdateAlt(db: AuditExecutor, actor: ContentActor, edits: readonly AltEdit[]): Promise<BulkAltResult> {
  const result: BulkAltResult = { updated: [], failed: [] };
  const ids = edits.map((e) => e.id);
  const existing = new Map((ids.length ? await db.select().from(images).where(inArray(images.id, ids)) : []).map((r) => [r.id, r]));
  for (const edit of edits) {
    const before = existing.get(edit.id);
    if (!before) {
      result.failed.push({ id: edit.id, reason: "notFound" });
      continue;
    }
    const altTh = edit.isDecorative ? "" : edit.altTh.trim();
    const altEn = edit.isDecorative ? "" : edit.altEn.trim();
    if (!edit.isDecorative && (!altTh || !altEn)) {
      result.failed.push({ id: edit.id, reason: "missingAlt" });
      continue;
    }
    await withAudit(db, actor.context, async (tx, audit) => {
      const [after] = await tx.update(images).set({ altTh, altEn, isDecorative: edit.isDecorative }).where(eq(images.id, edit.id)).returning();
      await audit({ action: "images.update", entityType: "images", entityId: edit.id, before, after });
    });
    result.updated.push(edit.id);
  }
  return result;
}

export interface BulkDeleteResult {
  /** Deleted rows with the stored file to remove afterwards. */
  deleted: { id: string; storageKey: string }[];
  failed: { id: string; reason: "notFound" | "inUse"; uses?: ImageUse[] }[];
}

function isForeignKeyViolation(error: unknown): boolean {
  for (let e = error as { cause?: unknown; code?: string } | undefined, i = 0; e && i < 4; e = e.cause as typeof e, i++) {
    if (e.code === "23503") return true;
  }
  return false;
}

/**
 * Deletes the listed pictures that nothing uses. Usage is scanned once; a used
 * picture is refused with where it is used, a missing one with `notFound`.
 * The caller removes the stored files afterwards.
 */
export async function bulkDeleteImages(db: AuditExecutor, actor: ContentActor, ids: readonly string[]): Promise<BulkDeleteResult> {
  const result: BulkDeleteResult = { deleted: [], failed: [] };
  if (ids.length === 0) return result;
  const usage = await scanImageUsage(db);
  for (const id of ids) {
    const uses = usage.get(id);
    if (uses?.length) {
      result.failed.push({ id, reason: "inUse", uses });
      continue;
    }
    try {
      const outcome = await withAudit(db, actor.context, async (tx, audit) => {
        const [before] = await tx.select().from(images).where(eq(images.id, id));
        if (!before) return null;
        await tx.delete(images).where(eq(images.id, id));
        await audit({ action: "images.delete", entityType: "images", entityId: id, before });
        return before as ImageRow;
      });
      if (outcome) result.deleted.push({ id, storageKey: outcome.storageKey });
      else result.failed.push({ id, reason: "notFound" });
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      result.failed.push({ id, reason: "inUse" });
    }
  }
  return result;
}
