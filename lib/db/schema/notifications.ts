import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/** What a notification is about. Open vocabulary in code; the staff strings for each live in lib/i18n/admin-content/notifications.ts. */
export const NOTIFICATION_KINDS = ["case_assigned", "case_mention", "complaint_escalated", "borrowing_overdue", "invite_accepted"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * One row per person per event. Text is not stored: `params` holds the few
 * values the strings need (a reference, a name, a date), so the title and body
 * are rendered in the reader's language when the page loads. `params` never
 * holds personal data from a case. `dedupe_key` makes a job safe to run twice:
 * the pair (user, key) is inserted once.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    params: jsonb("params").$type<Record<string, string | number | null>>().notNull().default({}),
    href: text("href").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt.desc()),
    index("notifications_unread_idx").on(t.userId).where(sql`${t.readAt} is null`),
    uniqueIndex("notifications_dedupe_unique").on(t.userId, t.dedupeKey).where(sql`${t.dedupeKey} is not null`),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
