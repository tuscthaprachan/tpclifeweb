import { eq } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { saveContent } from "@/lib/admin/content/save";
import { recordAudit, type AuditExecutor } from "@/lib/db/audit";
import { nextLostFoundReference } from "@/lib/db/references";
import { auditedLostFoundItems } from "@/lib/lost-found/audited-item";
import { lostFoundItemPhotos, lostFoundItems } from "@/lib/db/schema";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { bangkokDateKey } from "@/lib/i18n/format";
import type { LostFoundFormData } from "./validate";

export { auditedLostFoundItems };

/** Writes the private columns and, when they changed, an audit entry that says so without holding the values. */
async function savePrivateFields(
  tx: AuditExecutor,
  actor: ContentActor,
  itemId: string,
  values: { submitterContact: string | null; staffVerificationDetail: string | null },
): Promise<void> {
  const [before] = await tx
    .select({ submitterContact: lostFoundItems.submitterContact, staffVerificationDetail: lostFoundItems.staffVerificationDetail })
    .from(lostFoundItems)
    .where(eq(lostFoundItems.id, itemId));
  await tx.update(lostFoundItems).set(values).where(eq(lostFoundItems.id, itemId));
  const changed = (["submitterContact", "staffVerificationDetail"] as const).filter((k) => (before?.[k] ?? null) !== values[k]);
  if (changed.length > 0) {
    await recordAudit(tx, { ...actor.context, action: "lost_found_items.private_update", entityType: "lost_found_items", entityId: itemId, after: { changed } });
  }
}

/**
 * Creates or updates a listing and its photos through `saveContent`. A new
 * listing gets its reference ("LF-2026-0001") from the per-year counter in
 * the same transaction, so a failed save gives the number back; the slug is
 * the lowercased reference, as for reports sent in by the public. The
 * reference never changes after that.
 */
export async function saveLostFoundItem(
  db: AuditExecutor,
  input: { actor: ContentActor; id?: string; status?: ContentStatus; data: LostFoundFormData; now?: Date },
) {
  const { actor, id, status, data } = input;
  const year = Number(bangkokDateKey(input.now).slice(0, 4));

  const write = async (tx: AuditExecutor) => {
    const reference = id ? undefined : await nextLostFoundReference(tx, year);
    return saveContent({
      entityType: "lostFoundItem",
      table: auditedLostFoundItems,
      actor,
      db: tx,
      id,
      status,
      now: input.now,
      values: {
        ...(reference ? { reference, slug: reference.toLowerCase() } : {}),
        kind: data.kind,
        titleTh: data.title.th,
        titleEn: data.title.en,
        descriptionTh: data.description.th,
        descriptionEn: data.description.en,
        category: data.category,
        placeId: data.placeId,
        locationNoteTh: data.locationNote.th || null,
        locationNoteEn: data.locationNote.en || null,
        occurredOn: data.occurredOn,
        registerStatus: data.registerStatus,
        heldAtTh: data.heldAt.th || null,
        heldAtEn: data.heldAt.en || null,
        claimBy: data.claimBy,
        claimContact: data.claimContact,
        owner: data.owner,
        resolvedAt: data.resolvedAt,
      },
      children: async (inner, itemId) => {
        await inner.delete(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, itemId));
        const rows = data.photos.map((imageId, position) => ({ itemId, imageId, position }));
        if (rows.length > 0) await inner.insert(lostFoundItemPhotos).values(rows);
        if (data.privateIncluded) await savePrivateFields(inner, actor, itemId, { submitterContact: data.submitterContact, staffVerificationDetail: data.staffVerificationDetail });
        return { photos: rows };
      },
    });
  };

  // A new listing allocates its reference in the same transaction as the insert.
  return id ? write(db) : db.transaction(write);
}
