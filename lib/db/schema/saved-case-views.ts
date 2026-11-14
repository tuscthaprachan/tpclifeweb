import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * A named set of case inbox filters. `query` is the inbox query string
 * (without the leading `?`), reduced to the filter and sort parameters when
 * saved. A view is the owner's alone unless `shared`, which shows it to every
 * member of staff who can open the inbox; only the owner changes or deletes it.
 */
export const savedCaseViews = pgTable(
  "saved_case_views",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    query: text("query").notNull().default(""),
    shared: boolean("shared").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_case_views_user_idx").on(t.userId), index("saved_case_views_shared_idx").on(t.shared).where(sql`${t.shared}`)],
);

export type SavedCaseViewRow = typeof savedCaseViews.$inferSelect;
