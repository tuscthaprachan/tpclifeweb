import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns, requiredRichDoc, richDoc } from "./common";
import { categoryEnum, ownerEnum } from "./enums";
import { forms } from "./forms";
import { images } from "./images";
import { places } from "./directory";

/** News. List order: published_at desc, over published rows only. */
export const newsPosts = pgTable(
  "news_posts",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    summaryTh: text("summary_th").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyTh: requiredRichDoc("body_th"),
    bodyEn: requiredRichDoc("body_en"),
    owner: ownerEnum("owner").notNull(),
    category: categoryEnum("category"),
    coverImageId: uuid("cover_image_id").references(() => images.id, { onDelete: "set null" }),
  },
  (t) => [index("news_posts_listing_idx").on(t.status, t.publishedAt.desc())],
);

/** Gallery under the body, in editor order. */
export const newsPostImages = pgTable(
  "news_post_images",
  {
    newsPostId: uuid("news_post_id")
      .notNull()
      .references(() => newsPosts.id, { onDelete: "cascade" }),
    imageId: uuid("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.newsPostId, t.position] }), index("news_post_images_image_idx").on(t.imageId)],
);

/** Bilingual tags, a child table so a tag filter is a plain join. */
export const newsPostTags = pgTable(
  "news_post_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    newsPostId: uuid("news_post_id")
      .notNull()
      .references(() => newsPosts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    labelTh: text("label_th").notNull().default(""),
    labelEn: text("label_en").notNull().default(""),
  },
  (t) => [unique("news_post_tags_position").on(t.newsPostId, t.position)],
);

/**
 * Events. "Upcoming" is `coalesce(ends_at, starts_at) >= $now`, which means
 * "no end and starts later, or ends later", and is served by events_upcoming_idx (an expression index).
 */
export const events = pgTable(
  "events",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    summaryTh: text("summary_th").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    bodyTh: richDoc("body_th"),
    bodyEn: richDoc("body_en"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isAllDay: boolean("is_all_day").notNull().default(false),
    locationTh: text("location_th"),
    locationEn: text("location_en"),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    owner: ownerEnum("owner").notNull(),
    category: categoryEnum("category"),
    coverImageId: uuid("cover_image_id").references(() => images.id, { onDelete: "set null" }),
    relatedFormId: uuid("related_form_id").references(() => forms.id, { onDelete: "set null" }),
    registrationUrl: text("registration_url"),
    isCancelled: boolean("is_cancelled").notNull().default(false),
    cancellationNoteTh: text("cancellation_note_th"),
    cancellationNoteEn: text("cancellation_note_en"),
  },
  (t) => [
    index("events_upcoming_idx").on(t.status, sql`coalesce(${t.endsAt}, ${t.startsAt})`),
    index("events_starts_at_idx").on(t.startsAt),
    index("events_place_idx").on(t.placeId),
    index("events_related_form_idx").on(t.relatedFormId),
  ],
);

export type NewsPostRow = typeof newsPosts.$inferSelect;
export type EventRow = typeof events.$inferSelect;
