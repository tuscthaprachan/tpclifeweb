import { eq, isNotNull, or, sql, type SQL } from "drizzle-orm";
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
  siteSettings,
} from "@/lib/db/schema";
import { collectRichTextRefs } from "@/lib/rich-text/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";

/** How an item uses a picture. */
export type ImageUseRole = "cover" | "gallery" | "photo" | "text" | "settings";

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
  kind?: AnyPgColumn;
  direct?: { column: AnyPgColumn; role: ImageUseRole }[];
  rich?: AnyPgColumn[];
}

const SOURCES: Source[] = [
  { segment: "news", table: newsPosts, id: newsPosts.id, titleTh: newsPosts.titleTh, titleEn: newsPosts.titleEn, direct: [{ column: newsPosts.coverImageId, role: "cover" }], rich: [newsPosts.bodyTh, newsPosts.bodyEn] },
  { segment: "events", table: events, id: events.id, titleTh: events.titleTh, titleEn: events.titleEn, direct: [{ column: events.coverImageId, role: "cover" }], rich: [events.bodyTh, events.bodyEn] },
  { segment: "topics", table: contentPages, id: contentPages.id, titleTh: contentPages.titleTh, titleEn: contentPages.titleEn, rich: [contentPages.bodyTh, contentPages.bodyEn] },
  { segment: "faqs", table: faqs, id: faqs.id, titleTh: faqs.questionTh, titleEn: faqs.questionEn, rich: [faqs.answerTh, faqs.answerEn] },
  { segment: "forms", table: forms, id: forms.id, titleTh: forms.titleTh, titleEn: forms.titleEn, rich: [forms.descriptionTh, forms.descriptionEn] },
  { segment: "policies", table: policies, id: policies.id, titleTh: policies.titleTh, titleEn: policies.titleEn, rich: [policies.detailTh, policies.detailEn] },
  { segment: "canteen-stalls", table: canteenStalls, id: canteenStalls.id, titleTh: canteenStalls.nameTh, titleEn: canteenStalls.nameEn, direct: [{ column: canteenStalls.photoId, role: "photo" }] },
  { segment: "canteen-dishes", table: canteenDishes, id: canteenDishes.id, titleTh: canteenDishes.nameTh, titleEn: canteenDishes.nameEn, direct: [{ column: canteenDishes.photoId, role: "photo" }] },
];

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** Where each picture is used, keyed by picture id. A picture with no uses is absent. */
export type ImageUsageMap = Map<string, ImageUse[]>;

function add(map: ImageUsageMap, imageId: string, use: ImageUse) {
  const list = map.get(imageId) ?? [];
  if (!list.some((u) => u.segment === use.segment && u.id === use.id && u.role === use.role)) list.push(use);
  map.set(imageId, list);
}

/**
 * Every use of every picture, in one pass over the content tables. Cover and
 * photo columns and the gallery joins are read directly. Rich text keeps ids
 * inside JSON where no foreign key can see them, so only rows whose document
 * mentions an `imageId` are fetched, and each is confirmed against the parsed
 * document, so an id that merely appears as other text does not count.
 * Site settings are searched for any id in their lists.
 */
export async function scanImageUsage(db: AuditExecutor): Promise<ImageUsageMap> {
  const map: ImageUsageMap = new Map();

  for (const source of SOURCES) {
    const conditions: SQL[] = [
      ...(source.direct ?? []).map((d) => isNotNull(d.column)),
      ...(source.rich ?? []).map((c) => sql`${c}::text like '%imageId%'`),
    ];
    if (conditions.length === 0) continue;

    const selection: Record<string, AnyPgColumn> = { id: source.id, titleTh: source.titleTh, titleEn: source.titleEn };
    if (source.kind) selection.kind = source.kind;
    (source.direct ?? []).forEach((d, i) => (selection[`direct${i}`] = d.column));
    (source.rich ?? []).forEach((c, i) => (selection[`rich${i}`] = c));

    const rows = (await db.select(selection).from(source.table).where(or(...conditions))) as Record<string, unknown>[];
    for (const row of rows) {
      const segment = typeof source.segment === "function" ? source.segment(row) : source.segment;
      const base = { segment, id: String(row.id), title: { th: String(row.titleTh ?? ""), en: String(row.titleEn ?? "") } };
      (source.direct ?? []).forEach((d, i) => {
        const value = row[`direct${i}`];
        if (typeof value === "string") add(map, value, { ...base, role: d.role });
      });
      (source.rich ?? []).forEach((_, i) => {
        for (const imageId of collectRichTextRefs(row[`rich${i}`] as RichTextDoc | null).imageIds) add(map, imageId, { ...base, role: "text" });
      });
    }
  }

  const galleries = await db
    .select({ id: newsPosts.id, titleTh: newsPosts.titleTh, titleEn: newsPosts.titleEn, imageId: newsPostImages.imageId })
    .from(newsPostImages)
    .innerJoin(newsPosts, eq(newsPosts.id, newsPostImages.newsPostId));
  for (const g of galleries) add(map, g.imageId, { segment: "news", id: g.id, title: { th: g.titleTh, en: g.titleEn }, role: "gallery" });

  const photos = await db
    .select({ id: lostFoundItems.id, titleTh: lostFoundItems.titleTh, titleEn: lostFoundItems.titleEn, imageId: lostFoundItemPhotos.imageId })
    .from(lostFoundItemPhotos)
    .innerJoin(lostFoundItems, eq(lostFoundItems.id, lostFoundItemPhotos.itemId));
  for (const p of photos) add(map, p.imageId, { segment: "lost-and-found", id: p.id, title: { th: p.titleTh, en: p.titleEn }, role: "photo" });

  const [settings] = await db.select().from(siteSettings).limit(1);
  if (settings) {
    const text = JSON.stringify([settings.primaryNav, settings.footerNav, settings.homeTasks, settings.helpContacts, settings.organisationLinks]);
    for (const imageId of new Set(text.match(UUID) ?? [])) {
      add(map, imageId, { segment: "site-settings", id: settings.id, title: { th: settings.serviceNameTh, en: settings.serviceNameEn }, role: "settings" });
    }
  }

  return map;
}

/** Everything that still points at one picture. */
export async function findImageUses(db: AuditExecutor, imageId: string): Promise<ImageUse[]> {
  return (await scanImageUsage(db)).get(imageId) ?? [];
}
