import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns, type HelpContactJson } from "./common";
import { images } from "./images";
import { places } from "./directory";
import { lostFoundCategoryEnum, lostFoundKindEnum, lostFoundStatusEnum, ownerEnum } from "./enums";

/**
 * Lost and found register: both halves (lost, found) in one table.
 *
 * TWO DIFFERENT "STATUS" FIELDS. The common `status` column (draft/published)
 * is the publication state: a public report is inserted as `draft` and means
 * "waiting for approval"; only `published` rows are visible to readers.
 * `register_status` is Sanity's `status` (open, matched, returned, unclaimed,
 * withdrawn): an explicit, hand-set editorial field with no inferred value.
 *
 * PRIVATE COLUMNS. `submitter_contact` and `staff_verification_detail` must
 * never reach a public page. Public reads go through `lost_found_public`
 * (below), a view that omits them and only shows published rows; the public
 * read layer should select from the view, never from this table.
 *
 * REFERENCE. "LF-2026-0001", allocated by `nextLostFoundReference` in
 * lib/db/references.ts from a per-year counter; unique here as a backstop. The
 * slug is the lowercased reference (the report action already did this).
 */
export const lostFoundItems = pgTable(
  "lost_found_items",
  {
    ...contentColumns(),
    reference: text("reference").notNull().unique(),
    slug: text("slug").notNull().unique(),
    kind: lostFoundKindEnum("kind").notNull(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    descriptionTh: text("description_th").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    category: lostFoundCategoryEnum("category").notNull(),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    locationNoteTh: text("location_note_th"),
    locationNoteEn: text("location_note_en"),
    /** The Asia/Bangkok calendar date it was lost or found. */
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    registerStatus: lostFoundStatusEnum("register_status").notNull().default("open"),
    /** Found items only: where it physically is, in words. */
    heldAtTh: text("held_at_th"),
    heldAtEn: text("held_at_en"),
    claimBy: date("claim_by", { mode: "string" }),
    claimContact: jsonb("claim_contact").$type<HelpContactJson>(),
    owner: ownerEnum("owner").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    submittedByStudent: boolean("submitted_by_student").notNull().default(false),
    /** PRIVATE. The reporter's contact detail. Never selected by public reads. */
    submitterContact: text("submitter_contact"),
    /** PRIVATE. The identifying detail held back to verify a claim. Never selected by public reads. */
    staffVerificationDetail: text("staff_verification_detail"),
  },
  (t) => [
    check("lost_found_reference_format", sql`${t.reference} ~ '^LF-[0-9]{4}-[0-9]{4,}$'`),
    // Public list: published rows, filtered by kind/category/register_status, newest occurrence first.
    index("lost_found_listing_idx").on(t.status, t.registerStatus, t.occurredOn.desc(), t.publishedAt.desc()),
    index("lost_found_kind_category_idx").on(t.kind, t.category),
    index("lost_found_place_idx").on(t.placeId),
    // Approval queue.
    index("lost_found_pending_idx").on(t.createdAt).where(sql`${t.status} = 'draft'`),
    index("lost_found_reference_lower_idx").on(sql`lower(${t.reference})`),
  ],
);

/** Photos of the item itself, in order. */
export const lostFoundItemPhotos = pgTable(
  "lost_found_item_photos",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => lostFoundItems.id, { onDelete: "cascade" }),
    imageId: uuid("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.position] }), index("lost_found_item_photos_image_idx").on(t.imageId)],
);

/**
 * Per-scope, per-year counters behind case references ("LF-2026-0001",
 * later "CP-2026-0001"). One row per (prefix, year); see lib/db/references.ts.
 */
export const referenceCounters = pgTable(
  "reference_counters",
  {
    prefix: text("prefix").notNull(),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.prefix, t.year] }), check("reference_counters_nonneg", sql`${t.lastValue} >= 0`)],
);

/**
 * The only thing public lost and found reads may select from. Published rows
 * only, and none of the private columns.
 */
export const lostFoundPublic = pgView("lost_found_public").as((qb) =>
  qb
    .select({
      id: lostFoundItems.id,
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
      publishedAt: lostFoundItems.publishedAt,
      resolvedAt: lostFoundItems.resolvedAt,
      submittedByStudent: lostFoundItems.submittedByStudent,
      createdAt: lostFoundItems.createdAt,
      updatedAt: lostFoundItems.updatedAt,
    })
    .from(lostFoundItems)
    .where(sql`${lostFoundItems.status} = 'published'`),
);

export type LostFoundItemRow = typeof lostFoundItems.$inferSelect;
export type LostFoundPublicRow = typeof lostFoundPublic.$inferSelect;
