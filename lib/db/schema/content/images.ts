import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every picture on the public site (stored in Vercel Blob).
 * `storage_key` is the object key behind the storage interface (Vercel Blob).
 *
 * WCAG 1.1.1: an image is either described in both languages or explicitly
 * decorative. The check enforces that for rows that are not decorative; the
 * columns default to '' so an upload can exist before it is described, but a
 * content row should not be published pointing at an undescribed image (the
 * admin publish rule checks that).
 */
export const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    altTh: text("alt_th").notNull().default(""),
    altEn: text("alt_en").notNull().default(""),
    isDecorative: boolean("is_decorative").notNull().default(false),
    captionTh: text("caption_th"),
    captionEn: text("caption_en"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [check("images_size_positive", sql`(${t.width} is null or ${t.width} > 0) and (${t.height} is null or ${t.height} > 0)`)],
);

export type ImageRow = typeof images.$inferSelect;
