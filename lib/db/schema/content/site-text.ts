import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import type { TextOverrides } from "@/lib/i18n/editable";
import { contentColumns } from "./common";

/**
 * The console's edits to the site's built-in text (lib/i18n/editable.ts).
 * `texts` maps `<namespace>.<key>` to the edited wording; only text that
 * differs from the built-in default is stored, so a later change to a default
 * still reaches the site. One row, like the Today settings.
 */
export const siteText = pgTable(
  "site_text",
  {
    ...contentColumns(),
    singletonKey: text("singleton_key").notNull().default("site-text"),
    texts: jsonb("texts").$type<TextOverrides>().notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [check("site_text_singleton", sql`${t.singletonKey} = 'site-text'`), unique("site_text_singleton_key").on(t.singletonKey)],
);

export type SiteTextRow = typeof siteText.$inferSelect;
