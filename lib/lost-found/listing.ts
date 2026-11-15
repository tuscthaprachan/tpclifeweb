/**
 * The public listing behind a lost and found case (`lost_found_items`, linked
 * by `case_id`). Every write goes through `saveContent`, so the row, its audit
 * entry and its revision commit together. The listing never holds personal
 * data: contacts live on the case, and the legacy plaintext private columns
 * are never read or written here.
 *
 * The listing shares the case's reference ("LF-2026-0001") and its slug is the
 * lowercased reference, so one number works for the case and the page.
 */

import { and, asc, eq, getTableName, ne, sql } from "drizzle-orm";
import type { ContentActor } from "@/lib/admin/content/access";
import { saveContent } from "@/lib/admin/content/save";
import { revalidateFor } from "@/lib/content/revalidate";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { lostFoundItemPhotos, lostFoundItems } from "@/lib/db/schema";
import type { ContentStatus, OWNERS } from "@/lib/db/schema/content/enums";
import type { LOST_FOUND_CATEGORIES, LOST_FOUND_STATUSES } from "@/lib/db/schema/content/enums";
import type { CaseActor, StaffActor } from "@/lib/cases/types";
import { auditedLostFoundItems } from "./audited-item";
import { listingRegisterFor, resolvedAtFor, unclaimedSql } from "./register";

type Category = (typeof LOST_FOUND_CATEGORIES)[number];
type Owner = (typeof OWNERS)[number];
type RegisterStatus = (typeof LOST_FOUND_STATUSES)[number];

export interface Bilingual {
  th: string;
  en: string;
}

/** A listing as staff see it. Only public columns: the legacy private columns are never selected. */
export interface ListingView {
  id: string;
  caseId: string;
  reference: string;
  slug: string;
  kind: "lost" | "found";
  status: ContentStatus;
  registerStatus: RegisterStatus;
  title: Bilingual;
  description: Bilingual;
  locationNote: Bilingual;
  heldAt: Bilingual;
  category: Category;
  placeId: string | null;
  occurredOn: string;
  owner: Owner;
  publishedAt: Date | null;
  photoCount: number;
}

/** What stops a listing being published. Staff see these as a checklist. */
export type ListingGap = "title_th" | "title_en" | "description_th" | "description_en" | "location";

/** Published content needs Thai and English, and a place or a note about where. Drafts may be incomplete. */
export function listingGaps(item: Pick<ListingView, "title" | "description" | "locationNote" | "placeId">): ListingGap[] {
  const gaps: ListingGap[] = [];
  if (!item.title.th.trim()) gaps.push("title_th");
  if (!item.title.en.trim()) gaps.push("title_en");
  if (!item.description.th.trim()) gaps.push("description_th");
  if (!item.description.en.trim()) gaps.push("description_en");
  if (!item.placeId && !item.locationNote.th.trim() && !item.locationNote.en.trim()) gaps.push("location");
  return gaps;
}

export class ListingIncompleteError extends Error {
  constructor(readonly gaps: ListingGap[]) {
    super(`The listing is incomplete: ${gaps.join(", ")}.`);
    this.name = "ListingIncompleteError";
  }
}

/** The `ContentActor` for a staff engine actor, so listing writes carry the same audit context. */
export function contentActorOf(actor: StaffActor): ContentActor {
  return {
    userId: actor.userId,
    context: { actorUserId: actor.userId, actorOrganisationId: actor.organisationId, ip: actor.context?.ip ?? null, userAgent: actor.context?.userAgent ?? null, requestId: actor.context?.requestId ?? null },
  };
}

const view = (
  r: Omit<typeof lostFoundItems.$inferSelect, "submitterContact" | "staffVerificationDetail">,
  photoCount: number,
): ListingView => ({
  id: r.id,
  caseId: r.caseId!,
  reference: r.reference,
  slug: r.slug,
  kind: r.kind,
  status: r.status,
  registerStatus: r.registerStatus,
  title: { th: r.titleTh, en: r.titleEn },
  description: { th: r.descriptionTh, en: r.descriptionEn },
  locationNote: { th: r.locationNoteTh ?? "", en: r.locationNoteEn ?? "" },
  heldAt: { th: r.heldAtTh ?? "", en: r.heldAtEn ?? "" },
  category: r.category,
  placeId: r.placeId,
  occurredOn: r.occurredOn,
  owner: r.owner,
  publishedAt: r.publishedAt,
  photoCount,
});

const publicColumns = {
  id: lostFoundItems.id,
  status: lostFoundItems.status,
  publishedAt: lostFoundItems.publishedAt,
  createdAt: lostFoundItems.createdAt,
  updatedAt: lostFoundItems.updatedAt,
  createdBy: lostFoundItems.createdBy,
  updatedBy: lostFoundItems.updatedBy,
  reference: lostFoundItems.reference,
  slug: lostFoundItems.slug,
  kind: lostFoundItems.kind,
  titleTh: lostFoundItems.titleTh,
  titleEn: lostFoundItems.titleEn,
  descriptionTh: lostFoundItems.descriptionTh,
  descriptionEn: lostFoundItems.descriptionEn,
  category: lostFoundItems.category,
  placeId: lostFoundItems.placeId,
  locationNoteTh: lostFoundItems.locationNoteTh,
  locationNoteEn: lostFoundItems.locationNoteEn,
  occurredOn: lostFoundItems.occurredOn,
  registerStatus: lostFoundItems.registerStatus,
  heldAtTh: lostFoundItems.heldAtTh,
  heldAtEn: lostFoundItems.heldAtEn,
  claimBy: lostFoundItems.claimBy,
  claimContact: lostFoundItems.claimContact,
  owner: lostFoundItems.owner,
  resolvedAt: lostFoundItems.resolvedAt,
  submittedByStudent: lostFoundItems.submittedByStudent,
  caseId: lostFoundItems.caseId,
};

/** The listing linked to a case, or null. */
export async function getListingForCase(db: AuditExecutor, caseId: string): Promise<ListingView | null> {
  const [row] = await db.select(publicColumns).from(lostFoundItems).where(eq(lostFoundItems.caseId, caseId)).limit(1);
  if (!row) return null;
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(lostFoundItemPhotos)
    .where(eq(lostFoundItemPhotos.itemId, row.id));
  return view(row as Parameters<typeof view>[0], n);
}

export interface NewListing {
  caseId: string;
  reference: string;
  kind: "lost" | "found";
  category: Category;
  title: Bilingual;
  description: Bilingual;
  placeId: string | null;
  locationNote: Bilingual;
  occurredOn: string;
  owner: Owner;
  heldAt?: Bilingual;
  /** True for a report that came from a student (so it shows in the approval queue until published). */
  submittedByStudent: boolean;
}

/** Inserts the draft listing for a case, inside the caller's transaction. */
export async function createDraftListing(tx: AuditExecutor, input: NewListing, actor: ContentActor, now: Date): Promise<string> {
  const saved = await saveContent({
    entityType: "lostFoundItem",
    table: auditedLostFoundItems,
    actor,
    db: tx,
    now,
    values: {
      reference: input.reference,
      slug: input.reference.toLowerCase(),
      kind: input.kind,
      titleTh: input.title.th,
      titleEn: input.title.en,
      descriptionTh: input.description.th,
      descriptionEn: input.description.en,
      category: input.category,
      placeId: input.placeId,
      locationNoteTh: input.locationNote.th || null,
      locationNoteEn: input.locationNote.en || null,
      occurredOn: input.occurredOn,
      registerStatus: "open",
      heldAtTh: input.heldAt?.th || null,
      heldAtEn: input.heldAt?.en || null,
      owner: input.owner,
      submittedByStudent: input.submittedByStudent,
      caseId: input.caseId,
    },
  });
  return saved.id;
}

export interface ListingTextChanges {
  category?: Category;
  title?: Bilingual;
  description?: Bilingual;
  placeId?: string | null;
  locationNote?: Bilingual;
  occurredOn?: string;
  heldAt?: Bilingual;
}

/** Updates the descriptive fields of a case's listing. Returns false when the case has no listing. */
export async function updateListingForCase(db: AuditExecutor, caseId: string, changes: ListingTextChanges, actor: ContentActor, now: Date): Promise<boolean> {
  const [row] = await db.select({ id: lostFoundItems.id }).from(lostFoundItems).where(eq(lostFoundItems.caseId, caseId));
  if (!row) return false;
  const values: Record<string, unknown> = {};
  if (changes.category) values.category = changes.category;
  if (changes.title) Object.assign(values, { titleTh: changes.title.th, titleEn: changes.title.en });
  if (changes.description) Object.assign(values, { descriptionTh: changes.description.th, descriptionEn: changes.description.en });
  if (changes.placeId !== undefined) values.placeId = changes.placeId;
  if (changes.locationNote) Object.assign(values, { locationNoteTh: changes.locationNote.th || null, locationNoteEn: changes.locationNote.en || null });
  if (changes.occurredOn) values.occurredOn = changes.occurredOn;
  if (changes.heldAt) Object.assign(values, { heldAtTh: changes.heldAt.th || null, heldAtEn: changes.heldAt.en || null });
  await saveContent({ entityType: "lostFoundItem", table: auditedLostFoundItems, actor, db, id: row.id, values, now });
  return true;
}

/**
 * Publishes the listing of a case. Throws `ListingIncompleteError` when a
 * language or the place is missing. Run inside the caller's transaction and
 * call `expireListing` once it has committed.
 */
export async function publishListingForCase(tx: AuditExecutor, caseId: string, actor: ContentActor, now: Date): Promise<ListingView> {
  const item = await getListingForCase(tx, caseId);
  if (!item) throw new ListingIncompleteError(["title_th", "title_en", "description_th", "description_en", "location"]);
  const gaps = listingGaps(item);
  if (gaps.length > 0) throw new ListingIncompleteError(gaps);
  if (item.status !== "published") {
    await saveContent({ entityType: "lostFoundItem", table: auditedLostFoundItems, actor, db: tx, id: item.id, status: "published", values: {}, now });
  }
  return { ...item, status: "published" };
}

/**
 * Sets the register status (open, matched, returned...) of a case's listing.
 * `returned`, `withdrawn` and `unclaimed` also stamp `resolved_at`; `open` and `matched` clear it. A no-op without a listing.
 */
export async function setListingRegisterStatus(tx: AuditExecutor, caseId: string, registerStatus: RegisterStatus, actor: ContentActor, now: Date): Promise<void> {
  const [row] = await tx.select({ id: lostFoundItems.id, registerStatus: lostFoundItems.registerStatus }).from(lostFoundItems).where(eq(lostFoundItems.caseId, caseId));
  if (!row || row.registerStatus === registerStatus) return;
  const resolvedAt = resolvedAtFor(registerStatus, now);
  await saveContent({
    entityType: "lostFoundItem",
    table: auditedLostFoundItems,
    actor,
    db: tx,
    id: row.id,
    values: { registerStatus, resolvedAt },
    now,
  });
}

/**
 * Puts the listing of a case in step with its case status (`listingRegisterFor`),
 * inside the caller's transaction. Staff writes go through `saveContent`; a
 * person on a public journey has no content actor, so the row is updated
 * directly. A no-op without a listing or for a status the table does not know.
 */
export async function syncListingRegister(tx: AuditExecutor, caseId: string, kind: string, status: string, actor: CaseActor, now: Date): Promise<void> {
  const register = listingRegisterFor(kind, status);
  if (!register) return;
  if (actor.kind === "staff") return setListingRegisterStatus(tx, caseId, register, contentActorOf(actor), now);
  const resolvedAt = resolvedAtFor(register, now);
  await tx
    .update(lostFoundItems)
    .set({ registerStatus: register, resolvedAt, updatedAt: now })
    .where(and(eq(lostFoundItems.caseId, caseId), ne(lostFoundItems.registerStatus, register)));
}

/** Expires the public caches for a case's listing. Call after the transaction commits. */
export async function expireListing(db: AuditExecutor, caseId: string): Promise<void> {
  const [row] = await db.select({ slug: lostFoundItems.slug }).from(lostFoundItems).where(eq(lostFoundItems.caseId, caseId));
  revalidateFor("lostFoundItem", row?.slug);
}

/** Links a public image to a listing as its next photo. */
export async function appendListingPhoto(tx: AuditExecutor, itemId: string, imageId: string): Promise<void> {
  const rows = await tx.select({ position: lostFoundItemPhotos.position }).from(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, itemId)).orderBy(asc(lostFoundItemPhotos.position));
  const next = rows.length > 0 ? rows[rows.length - 1]!.position + 1 : 0;
  await tx.insert(lostFoundItemPhotos).values({ itemId, imageId, position: next });
}


/** The audit entity type and action prefix `saveContent` uses for listings, so the audit viewer reads these entries as listing updates. */
const LISTING_TABLE = getTableName(lostFoundItems);

/**
 * Applies the derived `unclaimed` state: every published found listing that is
 * still `open` after its `claimBy` day (`isUnclaimed`) moves to `unclaimed`
 * through the register, with `resolved_at` stamped. The case keeps its status
 * (staff may still hand the item over). One audit entry per listing; returns the
 * case ids moved. Run by the daily retention job.
 */
export async function markUnclaimedListings(db: AuditExecutor, now: Date): Promise<string[]> {
  const due = await db
    .select({ id: lostFoundItems.id, caseId: lostFoundItems.caseId, slug: lostFoundItems.slug, claimBy: lostFoundItems.claimBy })
    .from(lostFoundItems)
    .where(and(eq(lostFoundItems.status, "published"), unclaimedSql(now, lostFoundItems)))
    .limit(500);
  const moved: string[] = [];
  for (const item of due) {
    const changed = await withAudit(db, { actorUserId: null }, async (tx, audit) => {
      const rows = await tx
        .update(lostFoundItems)
        .set({ registerStatus: "unclaimed", resolvedAt: resolvedAtFor("unclaimed", now), updatedAt: now })
        .where(and(eq(lostFoundItems.id, item.id), eq(lostFoundItems.registerStatus, "open")))
        .returning({ id: lostFoundItems.id });
      if (rows.length === 0) return false;
      await audit({ action: `${LISTING_TABLE}.update`, entityType: LISTING_TABLE, entityId: item.id, before: { registerStatus: "open" }, after: { registerStatus: "unclaimed", claimBy: item.claimBy } });
      return true;
    });
    if (!changed) continue;
    revalidateFor("lostFoundItem", item.slug);
    if (item.caseId) moved.push(item.caseId);
  }
  return moved;
}
