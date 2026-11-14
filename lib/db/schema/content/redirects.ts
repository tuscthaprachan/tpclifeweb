import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Path redirects, read by `proxy.ts`. `from_path` is a site path such as
 * `/en/news/old-slug`; `to_path` is a site path or an absolute https URL.
 * Slug changes on published content add rows here automatically.
 */
export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    fromPath: text("from_path").notNull().unique(),
    toPath: text("to_path").notNull(),
    status: integer("status").notNull().default(301),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    hits: integer("hits").notNull().default(0),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
  },
  (t) => [
    check("redirects_status", sql`${t.status} in (301, 308)`),
    check("redirects_not_self", sql`${t.fromPath} <> ${t.toPath}`),
    index("redirects_to_path_idx").on(t.toPath),
  ],
);

export type RedirectRow = typeof redirects.$inferSelect;
