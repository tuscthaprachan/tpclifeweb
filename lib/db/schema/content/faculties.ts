import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { contentColumns } from "./common";

/**
 * Faculties and colleges, for the issue reporting service. A student who
 * cannot take an issue to the student union (a faculty or a course matter) is
 * pointed to their faculty office and to the faculty's student committee, so
 * the office details live here and the committees link to a row
 * (`directory_organisations.faculty_id`).
 *
 * Every office field is optional and seeded blank: the service shows only what
 * an editor has filled in, and never invents a phone number or an address.
 * `sort_order` is the order faculties are listed in the faculty picker.
 */
export const faculties = pgTable(
  "faculties",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    officeLocationTh: text("office_location_th"),
    officeLocationEn: text("office_location_en"),
    officePhone: text("office_phone"),
    officeEmail: text("office_email"),
    officeWebsite: text("office_website"),
    /** Opening hours or any other note about reaching the office, free text. */
    officeNoteTh: text("office_note_th"),
    officeNoteEn: text("office_note_en"),
  },
  (t) => [index("faculties_listing_idx").on(t.status, t.sortOrder, t.nameEn)],
);

export type FacultyRow = typeof faculties.$inferSelect;
