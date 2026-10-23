import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { contentColumns, richDoc, type ExternalLinkJson } from "./common";
import { ownerEnum, policyStatusEnum } from "./enums";

/**
 * Policy tracker. `oversight_of_id` is the TUSU policy a TUSC item scrutinises
 * (self reference). `progress_percent` is only ever set by hand; nothing
 * derives it. Evidence links are jsonb (rendered whole); the update history is
 * a child table because the latest update is queried and each carries a status.
 */
export const policies = pgTable(
  "policies",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    summaryTh: text("summary_th").notNull().default(""),
    summaryEn: text("summary_en").notNull().default(""),
    detailTh: richDoc("detail_th"),
    detailEn: richDoc("detail_en"),
    owner: ownerEnum("owner").notNull(),
    policyAreaTh: text("policy_area_th").notNull().default(""),
    policyAreaEn: text("policy_area_en").notNull().default(""),
    policyStatus: policyStatusEnum("policy_status").notNull().default("notStarted"),
    progressPercent: integer("progress_percent"),
    startedAt: date("started_at", { mode: "string" }),
    targetDate: date("target_date", { mode: "string" }),
    completedAt: date("completed_at", { mode: "string" }),
    oversightOfId: uuid("oversight_of_id").references((): AnyPgColumn => policies.id, { onDelete: "set null" }),
    evidenceLinks: jsonb("evidence_links").$type<ExternalLinkJson[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [
    check("policies_progress_range", sql`${t.progressPercent} is null or (${t.progressPercent} between 0 and 100)`),
    check("policies_not_self_oversight", sql`${t.oversightOfId} is null or ${t.oversightOfId} <> ${t.id}`),
    index("policies_listing_idx").on(t.status, t.owner, t.titleEn),
    index("policies_oversight_idx").on(t.oversightOfId),
  ],
);

export const policyUpdates = pgTable(
  "policy_updates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    noteTh: text("note_th").notNull().default(""),
    noteEn: text("note_en").notNull().default(""),
    /** Status as at this update. */
    policyStatus: policyStatusEnum("policy_status").notNull(),
    authorTh: text("author_th"),
    authorEn: text("author_en"),
    evidenceUrl: text("evidence_url"),
  },
  (t) => [
    unique("policy_updates_position").on(t.policyId, t.position),
    index("policy_updates_policy_date_idx").on(t.policyId, t.date),
  ],
);

export type PolicyRow = typeof policies.$inferSelect;
export type PolicyUpdateRow = typeof policyUpdates.$inferSelect;
