import { boolean, date, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { places } from "@/lib/db/schema";
import { contentColumns, type HelpContactJson } from "@/lib/db/schema/content/common";
import { lostFoundCategoryEnum, lostFoundKindEnum, lostFoundStatusEnum, ownerEnum } from "@/lib/db/schema/content/enums";

/**
 * `lost_found_items` without its two private columns. `saveContent` copies
 * whole rows into the audit log and the revision history, which are kept for
 * good, so it is given this view of the table: the reporter's contact detail
 * and the verification detail never enter either (the listing's case id is not private, so it is here). They are written separately
 * (see `savePrivateFields`). Keep the columns in step with
 * lib/db/schema/content/lost-found.ts.
 */
export const auditedLostFoundItems = pgTable("lost_found_items", {
  ...contentColumns(),
  reference: text("reference").notNull(),
  slug: text("slug").notNull(),
  kind: lostFoundKindEnum("kind").notNull(),
  titleTh: text("title_th").notNull().default(""),
  titleEn: text("title_en").notNull().default(""),
  descriptionTh: text("description_th").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  category: lostFoundCategoryEnum("category").notNull(),
  placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
  locationNoteTh: text("location_note_th"),
  locationNoteEn: text("location_note_en"),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  registerStatus: lostFoundStatusEnum("register_status").notNull().default("open"),
  heldAtTh: text("held_at_th"),
  heldAtEn: text("held_at_en"),
  claimBy: date("claim_by", { mode: "string" }),
  claimContact: jsonb("claim_contact").$type<HelpContactJson>(),
  owner: ownerEnum("owner").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  submittedByStudent: boolean("submitted_by_student").notNull().default(false),
  /** The case behind the listing; set by the staff intake and the public journeys, never by the content editor. */
  caseId: uuid("case_id"),
});
