import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundItemPhotos, lostFoundPublic, type LostFoundPublicRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { readPlacesByIds } from "./directory";
import { loadImages } from "./images";
import { groupBy, iso, isoOrUndefined, ls, lsOpt, opt, optList } from "./map";
import { safeFetch } from "./safe-fetch";
import type { ContentImage, LostFoundCategory, LostFoundItem, LostFoundKind, LostFoundStatus } from "./types";

/**
 * Lost and found, public side.
 *
 * Every read here selects from the `lost_found_public` view, never from the
 * `lost_found_items` table. The view holds published rows only and leaves out
 * the reporter's contact detail and the staff verification detail, so those
 * cannot reach a page even through a mistake in this file. A public report is
 * inserted as a draft and is simply not in any of these results until staff
 * approve it. There is no "pending" flag to get wrong.
 *
 * Filtering happens in SQL rather than in the page, so the list works with
 * JavaScript off: the filter form submits query parameters, the server reads
 * them, and `readLostFoundPage` does the work. A missing filter means "do not
 * filter on this".
 */

export interface LostFoundFilters {
  kind?: LostFoundKind | null;
  category?: LostFoundCategory | null;
  /** Omit to show every status; the list page passes "open" when the reader has not asked for more. */
  status?: LostFoundStatus | null;
}

export interface PagedLostFound {
  items: LostFoundItem[];
  total: number;
}

async function toItems(db: AuditExecutor, rows: LostFoundPublicRow[]): Promise<LostFoundItem[]> {
  if (rows.length === 0) return [];
  const photoRows = await db
    .select()
    .from(lostFoundItemPhotos)
    .where(
      inArray(
        lostFoundItemPhotos.itemId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(lostFoundItemPhotos.position));
  const [placeById, imageById] = await Promise.all([
    readPlacesByIds(db, rows.map((r) => r.placeId)),
    loadImages(db, photoRows.map((p) => p.imageId)),
  ]);
  const photosByItem = groupBy(photoRows, (p) => p.itemId);

  return rows.map((row) => {
    const photos = (photosByItem.get(row.id) ?? [])
      .map((p) => imageById.get(p.imageId))
      .filter((image): image is ContentImage => image !== undefined);
    return {
      _id: row.id,
      _type: "lostFoundItem",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      reference: row.reference,
      kind: row.kind,
      title: ls(row.titleTh, row.titleEn),
      slug: { current: row.slug },
      description: ls(row.descriptionTh, row.descriptionEn),
      category: row.category,
      photos: optList(photos),
      place: row.placeId ? placeById.get(row.placeId) : undefined,
      locationNote: lsOpt(row.locationNoteTh, row.locationNoteEn),
      occurredOn: row.occurredOn,
      status: row.registerStatus,
      heldAt: lsOpt(row.heldAtTh, row.heldAtEn),
      claimBy: opt(row.claimBy),
      claimContact: opt(row.claimContact),
      owner: row.owner,
      publishedAt: iso(row.publishedAt ?? row.createdAt),
      resolvedAt: isoOrUndefined(row.resolvedAt),
      submittedByStudent: row.submittedByStudent,
    };
  });
}

/** Newest occurrence first. `page` is 1-based. */
export async function readLostFoundPage(
  db: AuditExecutor,
  filters: LostFoundFilters = {},
  page = 1,
  pageSize = 24,
): Promise<PagedLostFound> {
  const where = and(
    filters.kind ? eq(lostFoundPublic.kind, filters.kind) : undefined,
    filters.category ? eq(lostFoundPublic.category, filters.category) : undefined,
    filters.status ? eq(lostFoundPublic.registerStatus, filters.status) : undefined,
  );
  const rows = await db
    .select()
    .from(lostFoundPublic)
    .where(where)
    .orderBy(desc(lostFoundPublic.occurredOn), sql`${lostFoundPublic.publishedAt} desc nulls last`, lostFoundPublic.reference)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(lostFoundPublic).where(where);
  return { items: await toItems(db, rows), total };
}

export async function readLostFoundItemBySlug(db: AuditExecutor, slug: string): Promise<LostFoundItem | null> {
  const [row] = await db.select().from(lostFoundPublic).where(eq(lostFoundPublic.slug, slug)).limit(1);
  return row ? ((await toItems(db, [row]))[0] ?? null) : null;
}

/**
 * Looks an entry up by the reference code a student was given, so someone
 * holding "LF-2026-0184" on a slip of paper can find it without describing
 * the item again. Matched case-insensitively, because the code gets written
 * down by hand.
 */
export async function readLostFoundItemByReference(db: AuditExecutor, reference: string): Promise<LostFoundItem | null> {
  const [row] = await db
    .select()
    .from(lostFoundPublic)
    .where(sql`lower(${lostFoundPublic.reference}) = lower(${reference})`)
    .limit(1);
  return row ? ((await toItems(db, [row]))[0] ?? null) : null;
}

const TAGS = [CACHE_TAGS.lostFound, CACHE_TAGS.place, CACHE_TAGS.image] as const;

const cachedLostFoundPage = cachedRead(
  ["lost-found-page"],
  TAGS,
  REVALIDATE.content,
  (kind: LostFoundKind | null, category: LostFoundCategory | null, status: LostFoundStatus | null, page: number, pageSize: number) =>
    readLostFoundPage(getDb(), { kind, category, status }, page, pageSize),
);
const cachedLostFoundBySlug = cachedRead(["lost-found-by-slug"], TAGS, REVALIDATE.content, (slug: string) =>
  readLostFoundItemBySlug(getDb(), slug),
);
const cachedLostFoundByReference = cachedRead(["lost-found-by-reference"], TAGS, REVALIDATE.content, (reference: string) =>
  readLostFoundItemByReference(getDb(), reference),
);

/** `page` is 1-based. */
export async function getLostFoundPage(
  filters: LostFoundFilters = {},
  page = 1,
  pageSize = 24,
): Promise<PagedLostFound> {
  return safeFetch<PagedLostFound>(
    "getLostFoundPage",
    () => cachedLostFoundPage(filters.kind ?? null, filters.category ?? null, filters.status ?? null, page, pageSize),
    // An unreadable register is an empty register, not a broken page. The
    // reader still gets the report form and the contact details, which are
    // the two things they can act on when the list itself is unavailable.
    { items: [], total: 0 },
  );
}

export async function getLostFoundItemBySlug(slug: string): Promise<LostFoundItem | null> {
  return safeFetch<LostFoundItem | null>("getLostFoundItemBySlug", () => cachedLostFoundBySlug(slug), null);
}

export async function getLostFoundItemByReference(reference: string): Promise<LostFoundItem | null> {
  return safeFetch<LostFoundItem | null>("getLostFoundItemByReference", () => cachedLostFoundByReference(reference), null);
}
