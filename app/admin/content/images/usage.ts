import { eq, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  canteenDishes,
  canteenStalls,
  contentPages,
  events,
  faqs,
  forms,
  lostFoundItemPhotos,
  lostFoundItems,
  newsPostImages,
  newsPosts,
  policies,
} from "@/lib/db/schema";
import { collectRichTextRefs } from "@/lib/rich-text/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";

/** How an item uses a picture. */
export type ImageUseRole = "cover" | "gallery" | "photo" | "text";

/** One item that still uses a picture. `segment` is its admin path under /admin/content. */
export interface ImageUse {
  segment: string;
  id: string;
  title: { th: string; en: string };
  role: ImageUseRole;
}

interface Source {
  segment: string | ((row: Record<string, unknown>) => string);
  table: AnyPgTable;
  id: AnyPgColumn;
  titleTh: AnyPgColumn;
  titleEn: AnyPgColumn;
  /** Extra column the segment depends on (pages split by kind). */
  kind?: AnyPgColumn;
  /** Columns holding one image id. */
  direct?: { column: AnyPgColumn; role: ImageUseRole }[];
  /** Rich text columns that can hold image blocks. */
  rich?: AnyPgColumn[];
}

const pageSegment = (row: Record<string, unknown>) => (row.kind === "welfare" ? "welfare" : "guides");

const SOURCES: Source[] = [
  { segment: "news", table: newsPosts, id: newsPosts.id, titleTh: newsPosts.titleTh, titleEn: newsPosts.titleEn, direct: [{ column: newsPosts.coverImageId, role: "cover" }], rich: [newsPosts.bodyTh, newsPosts.bodyEn] },
  { segment: "events", table: events, id: events.id, titleTh: events.titleTh, titleEn: events.titleEn, direct: [{ column: events.coverImageId, role: "cover" }], rich: [events.bodyTh, events.bodyEn] },
  { segment: pageSegment, table: contentPages, id: contentPages.id, titleTh: contentPages.titleTh, titleEn: contentPages.titleEn, kind: contentPages.kind, rich: [contentPages.bodyTh, contentPages.bodyEn] },
  { segment: "faqs", table: faqs, id: faqs.id, titleTh: faqs.questionTh, titleEn: faqs.questionEn, rich: [faqs.answerTh, faqs.answerEn] },
  { segment: "forms", table: forms, id: forms.id, titleTh: forms.titleTh, titleEn: forms.titleEn, rich: [forms.descriptionTh, forms.descriptionEn] },
  { segment: "policies", table: policies, id: policies.id, titleTh: policies.titleTh, titleEn: policies.titleEn, rich: [policies.detailTh, policies.detailEn] },
  { segment: "canteen-stalls", table: canteenStalls, id: canteenStalls.id, titleTh: canteenStalls.nameTh, titleEn: canteenStalls.nameEn, direct: [{ column: canteenStalls.photoId, role: "photo" }] },
  { segment: "canteen-dishes", table: canteenDishes, id: canteenDishes.id, titleTh: canteenDishes.nameTh, titleEn: canteenDishes.nameEn, direct: [{ column: canteenDishes.photoId, role: "photo" }] },
];

/**
 * Everything that still points at a picture. Foreign keys already stop a
 * delete for gallery and photo lists, but rich text documents hold picture
 * ids inside JSON where no foreign key can see them, so the rich text columns
 * are searched too. A text match is confirmed against the parsed document, so
 * an id that merely appears as other text does not count.
 */
export async function findImageUses(db: AuditExecutor, imageId: string): Promise<ImageUse[]> {
  const uses: ImageUse[] = [];

  for (const source of SOURCES) {
    const conditions: SQL[] = [
      ...(source.direct ?? []).map((d) => eq(d.column, imageId)),
      ...(source.rich ?? []).map((c) => sql`position(${imageId} in ${c}::text) > 0`),
    ];
    if (conditions.length === 0) continue;

    const selection: Record<string, AnyPgColumn> = { id: source.id, titleTh: source.titleTh, titleEn: source.titleEn };
    if (source.kind) selection.kind = source.kind;
    (source.direct ?? []).forEach((d, i) => (selection[`direct${i}`] = d.column));
    (source.rich ?? []).forEach((c, i) => (selection[`rich${i}`] = c));

    const rows = (await db.select(selection).from(source.table).where(or(...conditions))) as Record<string, unknown>[];
    for (const row of rows) {
      const segment = typeof source.segment === "function" ? source.segment(row) : source.segment;
      const title = { th: String(row.titleTh ?? ""), en: String(row.titleEn ?? "") };
      const base = { segment, id: String(row.id), title };
      const direct = (source.direct ?? []).find((d, i) => row[`direct${i}`] === imageId);
      if (direct) uses.push({ ...base, role: direct.role });
      const inText = (source.rich ?? []).some((_, i) => collectRichTextRefs(row[`rich${i}`] as RichTextDoc | null).imageIds.includes(imageId));
      if (inText) uses.push({ ...base, role: "text" });
    }
  }

  const galleries = await db
    .select({ id: newsPosts.id, titleTh: newsPosts.titleTh, titleEn: newsPosts.titleEn })
    .from(newsPostImages)
    .innerJoin(newsPosts, eq(newsPosts.id, newsPostImages.newsPostId))
    .where(eq(newsPostImages.imageId, imageId));
  for (const g of galleries) uses.push({ segment: "news", id: g.id, title: { th: g.titleTh, en: g.titleEn }, role: "gallery" });

  const photos = await db
    .select({ id: lostFoundItems.id, titleTh: lostFoundItems.titleTh, titleEn: lostFoundItems.titleEn })
    .from(lostFoundItemPhotos)
    .innerJoin(lostFoundItems, eq(lostFoundItems.id, lostFoundItemPhotos.itemId))
    .where(eq(lostFoundItemPhotos.imageId, imageId));
  for (const p of photos) uses.push({ segment: "lost-and-found", id: p.id, title: { th: p.titleTh, en: p.titleEn }, role: "photo" });

  return uses;
}
