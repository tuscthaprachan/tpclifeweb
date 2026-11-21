import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import { contentColumns } from "./common";

/** One override per language; a language left out falls back to the built-in text. */
export type ServiceTextOverrideJson = { th?: string; en?: string };

/**
 * Edited wording for the service start pages (borrowing, issue reporting,
 * lost and found, the Report page). `texts` maps a field key from
 * lib/content/service-pages.ts to the console's wording; only text that
 * differs from the built-in default is stored, so a later change to a default
 * still reaches the site. One row, like the Today settings.
 */
export const servicePages = pgTable(
  "service_pages",
  {
    ...contentColumns(),
    singletonKey: text("singleton_key").notNull().default("service-pages"),
    texts: jsonb("texts").$type<Record<string, ServiceTextOverrideJson>>().notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [check("service_pages_singleton", sql`${t.singletonKey} = 'service-pages'`), unique("service_pages_singleton_key").on(t.singletonKey)],
);

export type ServicePagesRow = typeof servicePages.$inferSelect;
