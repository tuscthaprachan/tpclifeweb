import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * The two student bodies that jointly run the services. Every staff role and
 * every audited action is attributed to one of them.
 */
export const organisations = pgTable("organisations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameTh: text("name_th").notNull(),
  nameEn: text("name_en").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Organisation = typeof organisations.$inferSelect;
