import { eq } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { images, type ImageRow } from "@/lib/db/schema";
import { findImageUses, type ImageUse } from "./usage";

export interface ImageDetails {
  altTh: string;
  altEn: string;
  isDecorative: boolean;
  captionTh: string | null;
  captionEn: string | null;
}

/** Updates a picture's description, decorative flag and caption, with an audit entry. Returns null if it no longer exists. */
export async function updateImage(db: AuditExecutor, actor: ContentActor, id: string, details: ImageDetails): Promise<ImageRow | null> {
  return withAudit(db, actor.context, async (tx, audit) => {
    const [before] = await tx.select().from(images).where(eq(images.id, id));
    if (!before) return null;
    const [after] = await tx.update(images).set(details).where(eq(images.id, id)).returning();
    await audit({ action: "images.update", entityType: "images", entityId: id, before, after });
    return after!;
  });
}

export type DeleteImageResult =
  | { ok: true; storageKey: string }
  | { ok: false; reason: "notFound" }
  | { ok: false; reason: "inUse"; uses: ImageUse[] };

function isForeignKeyViolation(error: unknown): boolean {
  for (let e = error as { cause?: unknown; code?: string } | undefined, i = 0; e && i < 4; e = e.cause as typeof e, i++) {
    if (e.code === "23503") return true;
  }
  return false;
}

/**
 * Deletes a picture row unless something uses it. Foreign keys catch gallery
 * and photo lists; `findImageUses` also covers cover pictures and rich text,
 * where the id sits inside JSON. The caller removes the stored file afterwards.
 */
export async function deleteImage(db: AuditExecutor, actor: ContentActor, id: string): Promise<DeleteImageResult> {
  const uses = await findImageUses(db, id);
  if (uses.length > 0) return { ok: false, reason: "inUse", uses };
  try {
    return await withAudit(db, actor.context, async (tx, audit): Promise<DeleteImageResult> => {
      const [before] = await tx.select().from(images).where(eq(images.id, id));
      if (!before) return { ok: false, reason: "notFound" };
      await tx.delete(images).where(eq(images.id, id));
      await audit({ action: "images.delete", entityType: "images", entityId: id, before });
      return { ok: true, storageKey: before.storageKey };
    });
  } catch (error) {
    if (!isForeignKeyViolation(error)) throw error;
    return { ok: false, reason: "inUse", uses: await findImageUses(db, id) };
  }
}
