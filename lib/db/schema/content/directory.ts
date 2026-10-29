import { sql } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { contentColumns, type OpeningHoursJson } from "./common";
import { categoryEnum, directoryOrganisationScopeEnum, directoryOrganisationTypeEnum } from "./enums";
import { organisations } from "../organisations";
import { faculties } from "./faculties";

export interface OrganisationContactJson {
  channel: "instagram" | "facebook" | "line" | "email" | "phone" | "website";
  /** Instagram and Facebook are stored as the bare handle, not a URL. */
  value: string;
  label?: { th: string; en: string };
}

/**
 * The student directory (clubs, faculty committees, independent groups,
 * university divisions, student bodies).
 *
 * Kept SEPARATE from the phase 1 `organisations` table. That table is the
 * authorisation and audit principal: a tiny, stable set (TUSU, TUSC) with an
 * integer key referenced by `staff_roles` and `audit_log`. Directory entries
 * are 40+ editable, publishable, bilingual content rows that come and go
 * every year, and putting them in the same table would put club listings in
 * the foreign-key path of every role grant. `organisation_id` links the two
 * where a directory entry IS one of those bodies (TUSU, TUSC), so a future
 * "staff of this entry" feature needs no guesswork.
 *
 * Contacts are jsonb: rendered whole on the directory card, never filtered.
 *
 * `faculty_th`/`faculty_en` stay as the text the directory groups by.
 * `faculty_id` links a faculty committee to its `faculties` row (the issue
 * reporting service signposts students to it), and `scope` says whether the
 * committee is the faculty-wide council (`faculty`) or the association of one
 * programme (`programme`, named in `programme_name_*`). Both are null for
 * clubs and other entries that belong to no faculty.
 */
export const directoryOrganisations = pgTable(
  "directory_organisations",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    type: directoryOrganisationTypeEnum("type").notNull(),
    facultyTh: text("faculty_th"),
    facultyEn: text("faculty_en"),
    descriptionTh: text("description_th"),
    descriptionEn: text("description_en"),
    contacts: jsonb("contacts").$type<OrganisationContactJson[]>().notNull().default(sql`'[]'::jsonb`),
    locationTh: text("location_th"),
    locationEn: text("location_en"),
    isActive: boolean("is_active").notNull().default(true),
    /** Set when this entry is the TUSU or TUSC principal from `organisations`. */
    organisationId: integer("organisation_id").references(() => organisations.id),
    facultyId: uuid("faculty_id").references(() => faculties.id),
    scope: directoryOrganisationScopeEnum("scope"),
    programmeNameTh: text("programme_name_th"),
    programmeNameEn: text("programme_name_en"),
  },
  (t) => [
    index("directory_organisations_listing_idx").on(t.status, t.isActive, t.nameEn),
    index("directory_organisations_faculty_idx").on(t.facultyId),
  ],
);

/**
 * Campus places. `opening_hours` is jsonb: evaluated in code (open now, next
 * opening) and never filtered in SQL.
 */
export const places = pgTable(
  "places",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    buildingTh: text("building_th"),
    buildingEn: text("building_en"),
    descriptionTh: text("description_th"),
    descriptionEn: text("description_en"),
    category: categoryEnum("category").notNull(),
    openingHours: jsonb("opening_hours").$type<OpeningHoursJson[]>().notNull().default(sql`'[]'::jsonb`),
    closureNoteTh: text("closure_note_th"),
    closureNoteEn: text("closure_note_en"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    isKeyLocation: boolean("is_key_location").notNull().default(false),
  },
  (t) => [
    index("places_listing_idx").on(t.status, t.nameEn),
    index("places_key_location_idx").on(t.nameEn).where(sql`${t.isKeyLocation} and ${t.status} = 'published'`),
  ],
);

export type DirectoryOrganisationRow = typeof directoryOrganisations.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
