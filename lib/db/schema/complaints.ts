import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { caseAttachments, cases } from "./cases";

/**
 * Complaints (lib/complaints), additive to the case engine's tables. A
 * complaint is a `cases` row (service `complaint`, kind `complaint`) plus one
 * `complaint_cases` row. The case row holds no personal data; everything a
 * person wrote is AES-256-GCM ciphertext here (lib/crypto/pii.ts, bound to its
 * row and column), and the people live in `case_contacts` as for every service.
 *
 * RETENTION. `purgeComplaintPii` (lib/complaints/retention.ts) runs inside the
 * engine's purge one year after closure: it clears every `*_enc` column, the
 * evidence rows go with their attachments (ON DELETE CASCADE), and survey
 * comments are cleared. Survey scores, categories and the due and resolved
 * dates stay for performance reporting; none of them identifies anyone.
 */

/**
 * What a complaint can be about. Edited by admins at /admin/complaints/categories.
 * Targets are working days (Monday to Friday, Bangkok). A `restricted`
 * category is visible only to the staff named in `complaint_category_access`
 * (lib/cases/restrictions.ts enforces it in the data layer). `offer_wellbeing`
 * shows the person the TU wellbeing centre's details when they submit.
 * `key` never changes once created; names and targets can.
 */
export const complaintCategories = pgTable(
  "complaint_categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    key: text("key").notNull().unique(),
    nameTh: text("name_th").notNull(),
    nameEn: text("name_en").notNull(),
    /** One plain sentence under the name on the category page. */
    hintTh: text("hint_th").notNull().default(""),
    hintEn: text("hint_en").notNull().default(""),
    acknowledgeDays: integer("acknowledge_days").notNull(),
    resolveDays: integer("resolve_days").notNull(),
    restricted: boolean("restricted").notNull().default(false),
    offerWellbeing: boolean("offer_wellbeing").notNull().default(false),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("complaint_categories_key_format", sql`${t.key} ~ '^[a-z][a-z0-9-]{0,39}$'`),
    check("complaint_categories_targets", sql`${t.acknowledgeDays} >= 1 and ${t.resolveDays} >= ${t.acknowledgeDays} and ${t.resolveDays} <= 365`),
  ],
);

/** The staff who may see complaints in a restricted category. Admins manage it; being an admin grants nothing here. */
export const complaintCategoryAccess = pgTable(
  "complaint_category_access",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => complaintCategories.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.userId] }), index("complaint_category_access_user_idx").on(t.userId)],
);

export const COMPLAINT_IDENTITIES = ["named", "pseudonymous", "anonymous"] as const;
export type ComplaintIdentity = (typeof COMPLAINT_IDENTITIES)[number];

export const COMPLAINT_ESCALATION_REASONS = ["acknowledge", "resolve"] as const;
export type ComplaintEscalationReason = (typeof COMPLAINT_ESCALATION_REASONS)[number];

/**
 * One row per complaint case. `acknowledge_due_at` and `resolve_due_at` are set
 * when the case opens (and again when it is recategorised or reopened) from the
 * category's targets, so a later change to a target never moves a promise
 * already made to a person. `escalated_at` is the flag the daily job sets when
 * a target is missed; it is not a status.
 */
export const complaintCases = pgTable(
  "complaint_cases",
  {
    caseId: uuid("case_id")
      .primaryKey()
      .references(() => cases.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => complaintCategories.id),
    identity: text("identity").notNull(),
    /** What happened. */
    descriptionEnc: text("description_enc"),
    /** When it happened, as the person wrote it. */
    whenEnc: text("when_enc"),
    /** Where it happened, as the person wrote it. */
    whereEnc: text("where_enc"),
    /** What would put it right. */
    remedyEnc: text("remedy_enc"),
    /** Why the person reopened the complaint (the latest time). */
    reopenReasonEnc: text("reopen_reason_enc"),
    acknowledgeDueAt: timestamp("acknowledge_due_at", { withTimezone: true }).notNull(),
    resolveDueAt: timestamp("resolve_due_at", { withTimezone: true }).notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    escalatedReason: text("escalated_reason"),
    wellbeingRoutedAt: timestamp("wellbeing_routed_at", { withTimezone: true }),
    reopenCount: integer("reopen_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("complaint_cases_identity", sql`${t.identity} in ('named', 'pseudonymous', 'anonymous')`),
    index("complaint_cases_category_idx").on(t.categoryId),
    index("complaint_cases_resolved_idx").on(t.resolvedAt),
  ],
);

/**
 * Evidence the person attached. The file is a private `case_attachments` object
 * (random key, deleted with the case by retention); this row adds the original
 * file name, encrypted, because a file name can identify a person.
 */
export const complaintEvidence = pgTable(
  "complaint_evidence",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    attachmentId: uuid("attachment_id")
      .notNull()
      .unique()
      .references(() => caseAttachments.id, { onDelete: "cascade" }),
    nameEnc: text("name_enc"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("complaint_evidence_case_idx").on(t.caseId)],
);

/**
 * The satisfaction survey after a resolution: 1 to 5 and an optional comment.
 * One per resolution (`round` counts reopenings). The comment is encrypted and
 * cleared by retention; the score is kept.
 */
export const complaintSurveys = pgTable(
  "complaint_surveys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => complaintCategories.id),
    round: integer("round").notNull().default(0),
    score: smallint("score").notNull(),
    commentEnc: text("comment_enc"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("complaint_surveys_score", sql`${t.score} between 1 and 5`), unique("complaint_surveys_case_round").on(t.caseId, t.round)],
);

/**
 * A complaint journey in progress, kept between pages without JavaScript. The
 * browser holds only a random token in an httpOnly cookie; the answers are
 * encrypted in `data_enc` (bound to the row id). Rows expire quickly and are
 * swept on each new journey. Files uploaded as evidence before the complaint
 * exists are listed in `complaint_journey_files` so an abandoned journey's
 * files can be deleted with it.
 */
export const complaintJourneys = pgTable(
  "complaint_journeys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tokenHash: text("token_hash").notNull().unique(),
    dataEnc: text("data_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("complaint_journeys_expires_idx").on(t.expiresAt)],
);

export const complaintJourneyFiles = pgTable(
  "complaint_journey_files",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => complaintJourneys.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    nameEnc: text("name_enc"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("complaint_journey_files_journey_idx").on(t.journeyId)],
);

export type ComplaintCategoryRow = typeof complaintCategories.$inferSelect;
export type ComplaintCaseRow = typeof complaintCases.$inferSelect;
