import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { cases, caseContacts } from "./cases";
import { organisations } from "./organisations";

/**
 * Staff-side lost and found records that sit beside the shared case engine.
 * Every personal or identifying field is AES-256-GCM ciphertext
 * (lib/crypto/pii.ts); retention clears them with the case's contacts
 * (lib/lost-found/retention.ts, called from lib/cases/retention.ts).
 */

export { ID_CHECK_TYPES, type IdCheckType } from "@/lib/lost-found/constants";

/** Link states: a match staff are considering, one that led to a handover, and one ruled out. */
export const MATCH_LINK_STATUSES = ["possible", "confirmed", "dismissed"] as const;
export type MatchLinkStatus = (typeof MATCH_LINK_STATUSES)[number];

export const CLAIM_DECISIONS = ["accepted", "rejected"] as const;
export type ClaimDecision = (typeof CLAIM_DECISIONS)[number];

/**
 * One row per found item case. Where the item is held (not personal data) and
 * the hidden verification detail (encrypted; shown to staff only on a logged
 * "Show"). `verification_detail_enc` is cleared by retention.
 */
export const lostFoundCaseDetails = pgTable("lost_found_case_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id),
  /** The desk (TUSU or TUSC) that physically holds the item. */
  storageOrganisationId: integer("storage_organisation_id").references(() => organisations.id),
  /** Shelf, box or drawer label. Must not hold personal data. */
  storageShelf: text("storage_shelf"),
  verificationDetailEnc: text("verification_detail_enc"),
  verificationUpdatedAt: timestamp("verification_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A lost report linked to a found item as a possible (then confirmed) match. */
export const lostFoundCaseLinks = pgTable(
  "lost_found_case_links",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    lostCaseId: uuid("lost_case_id")
      .notNull()
      .references(() => cases.id),
    foundCaseId: uuid("found_case_id")
      .notNull()
      .references(() => cases.id),
    status: text("status").notNull().default("possible"),
    /** The ranking score (0 to 100) when staff linked them. */
    score: integer("score"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lost_found_case_links_pair_unique").on(t.lostCaseId, t.foundCaseId),
    index("lost_found_case_links_found_idx").on(t.foundCaseId),
    check("lost_found_case_links_status", sql`${t.status} in ('possible', 'confirmed', 'dismissed')`),
  ],
);

/**
 * A claim on a found item. `answer_enc` holds the claimant's answer to the
 * verification question (encrypted, cleared by retention). The claimant's
 * contact is a `case_contacts` row of role `claimant` on the found item case.
 */
export const lostFoundClaims = pgTable(
  "lost_found_claims",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** The found item case being claimed. */
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    /** The claimant's lost report, if they have one. */
    lostCaseId: uuid("lost_case_id").references(() => cases.id),
    claimantContactId: uuid("claimant_contact_id").references(() => caseContacts.id, { onDelete: "set null" }),
    answerEnc: text("answer_enc"),
    decision: text("decision"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lost_found_claims_case_idx").on(t.caseId),
    check("lost_found_claims_decision", sql`${t.decision} is null or ${t.decision} in ('accepted', 'rejected')`),
  ],
);

/**
 * The handover record. The ID check is a type only (no number, no photo).
 * The collector's name is the encrypted contact `collected_by_contact_id`.
 */
export const lostFoundHandovers = pgTable(
  "lost_found_handovers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .unique()
      .references(() => cases.id),
    lostCaseId: uuid("lost_case_id").references(() => cases.id),
    collectedByContactId: uuid("collected_by_contact_id").references(() => caseContacts.id, { onDelete: "set null" }),
    idCheckType: text("id_check_type").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    deskOrganisationId: integer("desk_organisation_id")
      .notNull()
      .references(() => organisations.id),
    officerUserId: text("officer_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("lost_found_handovers_id_check", sql`${t.idCheckType} in ('student_card', 'national_id', 'passport', 'driving_licence', 'other_photo_id')`)],
);

export type LostFoundCaseDetailsRow = typeof lostFoundCaseDetails.$inferSelect;
export type LostFoundCaseLinkRow = typeof lostFoundCaseLinks.$inferSelect;
export type LostFoundClaimRow = typeof lostFoundClaims.$inferSelect;
export type LostFoundHandoverRow = typeof lostFoundHandovers.$inferSelect;
