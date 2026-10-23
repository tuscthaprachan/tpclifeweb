import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Simple revision history: a full jsonb snapshot of an entity (its row plus
 * child rows, as the writer chooses) taken before or after each staff edit.
 * Append-only by convention (the admin never updates or deletes). `entity_id`
 * is not a foreign key because it points into many tables, and a revision must
 * outlive a deleted entity.
 */
export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Table name of the entity, for example "forms" or "news_posts". */
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    /** 1, 2, 3... per entity. */
    revisionNumber: integer("revision_number").notNull(),
    revision: jsonb("revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [
    unique("content_revisions_entity_number").on(t.entityType, t.entityId, t.revisionNumber),
    index("content_revisions_entity_idx").on(t.entityType, t.entityId, t.createdAt),
  ],
);

export type ContentRevisionRow = typeof contentRevisions.$inferSelect;
