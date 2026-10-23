import { boolean, date, index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contentColumns, richDoc, type HelpContactJson, type LocaleStringJson } from "./common";
import { categoryEnum, formDestinationEnum, ownerEnum, signInTypeEnum } from "./enums";

export interface FormPrerequisiteJson {
  label: LocaleStringJson;
  detail?: LocaleStringJson;
}

/**
 * The centralised form directory. `prerequisites` is a jsonb checklist
 * (rendered whole, never filtered) and `contact` a single inline HelpContact.
 */
export const forms = pgTable(
  "forms",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    /** One sentence: what this form is for. */
    purposeTh: text("purpose_th").notNull().default(""),
    purposeEn: text("purpose_en").notNull().default(""),
    descriptionTh: richDoc("description_th"),
    descriptionEn: richDoc("description_en"),
    category: categoryEnum("category").notNull(),
    owner: ownerEnum("owner").notNull(),
    audienceTh: text("audience_th"),
    audienceEn: text("audience_en"),
    prerequisites: jsonb("prerequisites").$type<FormPrerequisiteJson[]>().notNull().default(sql`'[]'::jsonb`),
    requiresSignIn: boolean("requires_sign_in").notNull().default(false),
    signInType: signInTypeEnum("sign_in_type"),
    signInNoteTh: text("sign_in_note_th"),
    signInNoteEn: text("sign_in_note_en"),
    destinationType: formDestinationEnum("destination_type").notNull(),
    destinationUrl: text("destination_url"),
    estimatedMinutes: integer("estimated_minutes"),
    turnaroundTh: text("turnaround_th"),
    turnaroundEn: text("turnaround_en"),
    deadline: date("deadline", { mode: "string" }),
    contact: jsonb("contact").$type<HelpContactJson>(),
    isActive: boolean("is_active").notNull().default(true),
    isPriority: boolean("is_priority").notNull().default(false),
    lastVerified: date("last_verified", { mode: "string" }),
  },
  (t) => [index("forms_listing_idx").on(t.status, t.isActive, t.isPriority, t.titleEn)],
);

export type FormRow = typeof forms.$inferSelect;
