import { sql } from "drizzle-orm";
import { jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { RichTextDoc } from "../../../rich-text/types";
import { contentStatusEnum } from "./enums";

/**
 * Columns every editable content table carries (docs/backend-plan.md,
 * "Content"). A function, so each table gets its own column builders.
 *
 * `created_by` / `updated_by` are plain text user ids, not foreign keys, for
 * the same reason `audit_log.actor_user_id` is not: deleting a user for PDPA
 * reasons must neither be blocked by nor rewrite editorial history. They are
 * null for seeded rows and system writes.
 *
 * `published_at` is the editorial publication date. For news posts and lost
 * and found entries it is also the publication date.
 */
export function contentColumns() {
  return {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  };
}

/** An optional rich text document (one column per language). */
export const richDoc = (name: string) => jsonb(name).$type<RichTextDoc>();

/** A rich text document that is always present; defaults to an empty document so drafts can exist. */
export const requiredRichDoc = (name: string) =>
  jsonb(name)
    .$type<RichTextDoc>()
    .notNull()
    .default(sql`'{"type":"doc","content":[]}'::jsonb`);

/** `HelpContact` as stored inline (forms.contact, lost_found_items.claim_contact). */
export interface HelpContactJson {
  label: { th: string; en: string };
  channel: "line" | "email" | "phone" | "inPerson" | "url";
  value: string;
  hours?: { th: string; en: string };
}

export interface LocaleStringJson {
  th: string;
  en: string;
}

export interface NavItemJson {
  label: LocaleStringJson;
  path: string;
  children?: NavItemJson[];
}

export interface HomeTaskJson {
  label: LocaleStringJson;
  description: LocaleStringJson;
  path: string;
}

export interface ExternalLinkJson {
  label: LocaleStringJson;
  url: string;
  description?: LocaleStringJson;
  requiresSignIn?: boolean;
}

export interface OpeningHoursJson {
  /** 0 = Sunday through 6 = Saturday. */
  daysOfWeek: number[];
  opens: string;
  closes: string;
  note?: LocaleStringJson;
}
