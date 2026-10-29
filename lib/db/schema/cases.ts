import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organisations } from "./organisations";

/** The services that run on the shared case engine. */
export const CASE_SERVICES = ["lost_found", "complaint", "borrowing"] as const;
export type CaseService = (typeof CASE_SERVICES)[number];
export const caseServiceEnum = pgEnum("case_service", CASE_SERVICES);

/** `internal` events are staff only; `public` events may appear on the private tracking page. */
export const CASE_EVENT_VISIBILITIES = ["internal", "public"] as const;
export type CaseEventVisibility = (typeof CASE_EVENT_VISIBILITIES)[number];
export const caseEventVisibilityEnum = pgEnum("case_event_visibility", CASE_EVENT_VISIBILITIES);

/** Open vocabulary (text, not an enum) so later stages add event types without a type migration. */
export const CASE_EVENT_TYPES = [
  "created",
  "status_changed",
  "assigned",
  "internal_note",
  "public_update",
  "attachment_added",
  "contact_added",
  "contact_viewed",
  "verification_viewed",
  "claim_viewed",
  "tracking_link_issued",
  "tracking_link_revoked",
  "pii_deleted",
  // Complaints
  "resolution",
  "recategorised",
  "escalated",
  "wellbeing_routed",
  "redirected",
  "details_viewed",
  "evidence_viewed",
  "survey_received",
  // Borrowing
  "lines_changed",
  "handover_recorded",
  "return_recorded",
  "compensation_settled",
  "reminder_sent",
] as const;
export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];

/** Who a contact row describes within a case. */
export const CASE_CONTACT_ROLES = ["reporter", "owner", "finder", "claimant", "borrower"] as const;
export type CaseContactRole = (typeof CASE_CONTACT_ROLES)[number];

export const CASE_PREFERRED_CONTACTS = ["email", "phone", "line"] as const;
export type CasePreferredContact = (typeof CASE_PREFERRED_CONTACTS)[number];

/**
 * One row per case, for every service. Holds no personal data: people live in
 * `case_contacts`, which retention deletes. `summary` is a short staff-facing
 * description and must stay free of personal data.
 *
 * `status` is text validated in code against the service's state machine
 * (lib/cases/services), not an enum, so a service can change its statuses
 * without a database type migration. `kind` selects the state machine within
 * a service (lost_found has `lost` and `found`).
 *
 * `acting_organisation_id` is the body (TUSU or TUSC) whose staff last acted;
 * `owning_organisation_id` is the desk that holds the case or item.
 * `pii_delete_after` is `closed_at` plus one year; retention clears the
 * personal data after that and sets `pii_deleted_at`.
 */
export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    service: caseServiceEnum("service").notNull(),
    reference: text("reference").notNull().unique(),
    kind: text("kind").notNull(),
    subtype: text("subtype"),
    status: text("status").notNull(),
    summary: text("summary"),
    /** The language the person used, so replies can match. */
    locale: text("locale"),
    actingOrganisationId: integer("acting_organisation_id").references(() => organisations.id),
    owningOrganisationId: integer("owning_organisation_id").references(() => organisations.id),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    piiDeleteAfter: timestamp("pii_delete_after", { withTimezone: true }),
    piiDeletedAt: timestamp("pii_deleted_at", { withTimezone: true }),
  },
  (t) => [
    check("cases_reference_format", sql`${t.reference} ~ '^(LF|CP|BR)-[0-9]{4}-[0-9]{4,}$'`),
    check(
      "cases_reference_matches_service",
      sql`(${t.service}::text = 'lost_found' and ${t.reference} like 'LF-%') or (${t.service}::text = 'complaint' and ${t.reference} like 'CP-%') or (${t.service}::text = 'borrowing' and ${t.reference} like 'BR-%')`,
    ),
    index("cases_inbox_idx").on(t.service, t.status, t.updatedAt.desc()),
    index("cases_assigned_idx").on(t.assignedTo),
    index("cases_pii_due_idx").on(t.piiDeleteAfter).where(sql`${t.piiDeletedAt} is null and ${t.piiDeleteAfter} is not null`),
  ],
);

/**
 * The timeline. APPEND-ONLY: a migration installs triggers that reject UPDATE,
 * DELETE and TRUNCATE (as for `audit_log`). Corrections are new events.
 * Notes are not deleted by retention, so they must not hold personal data.
 *
 * `actor_user_id` is not a foreign key, so deleting a user never touches
 * history; it is null for the public and for the system.
 */
export const caseEvents = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    type: text("type").notNull(),
    visibility: caseEventVisibilityEnum("visibility").notNull().default("internal"),
    /** Internal notes: one language, staff only. */
    body: text("body"),
    /** Public updates: both languages, written by staff. */
    bodyTh: text("body_th"),
    bodyEn: text("body_en"),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorUserId: text("actor_user_id"),
    actingOrganisationId: integer("acting_organisation_id").references(() => organisations.id),
    /** Small structured detail (assignee, contact id, attachment id). Never personal data. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("case_events_case_idx").on(t.caseId, t.createdAt)],
);

/**
 * The people in a case. Every personal field is AES-256-GCM ciphertext
 * (lib/crypto/pii.ts, bound to its column and row). Retention deletes the
 * rows. `preferred_contact` and the consent flags are not personal data.
 */
export const caseContacts = pgTable(
  "case_contacts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    role: text("role").notNull(),
    nameEnc: text("name_enc"),
    emailEnc: text("email_enc"),
    phoneEnc: text("phone_enc"),
    lineIdEnc: text("line_id_enc"),
    preferredContact: text("preferred_contact"),
    /** The person agreed to be contacted about this case. */
    consentContact: boolean("consent_contact").notNull().default(false),
    /** The person agreed that details may be shared with the other party (for example owner and finder). */
    consentShare: boolean("consent_share").notNull().default(false),
    consentRecordedAt: timestamp("consent_recorded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("case_contacts_case_idx").on(t.caseId)],
);

/**
 * Private tracking links. Only the SHA-256 of the token is stored; the token
 * is shown once. Tracking needs the reference and the link together.
 */
export const caseAccessTokens = pgTable(
  "case_access_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    tokenHash: text("token_hash").notNull(),
    /**
     * Set when the link belongs to one claim on a found item (lost and found):
     * it then shows that claim and nothing else on the case. No foreign key,
     * because the claims table lives with the lost and found schema.
     */
    claimId: uuid("claim_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("case_access_tokens_hash_unique").on(t.tokenHash), index("case_access_tokens_case_idx").on(t.caseId)],
);

/** Private files (photos, evidence). `storage_key` is a `lib/storage` key; retention deletes the object and the row. */
export const caseAttachments = pgTable(
  "case_attachments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    eventId: uuid("event_id").references(() => caseEvents.id),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("case_attachments_case_idx").on(t.caseId)],
);

export type CaseRow = typeof cases.$inferSelect;
export type CaseEventRow = typeof caseEvents.$inferSelect;
export type CaseContactRow = typeof caseContacts.$inferSelect;
export type CaseAccessTokenRow = typeof caseAccessTokens.$inferSelect;
export type CaseAttachmentRow = typeof caseAttachments.$inferSelect;
