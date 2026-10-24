import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { caseContacts, cases } from "./cases";

/**
 * Public lost and found journeys (lib/lost-found/public). Two tables, additive
 * to the case engine's. Claims on found items use `lost_found_claims` in
 * lost-found-staff.ts (the staff side owns it; the public journey inserts rows).
 *
 * RETENTION. `lost_found_identifying_details` hangs off a `case_contacts` row
 * with ON DELETE CASCADE. The engine's retention job deletes a case's contacts
 * one year after it closes (lib/cases/retention.ts), so these rows go with
 * them without that job knowing they exist. Never make `contact_id` nullable
 * or drop the cascade: that would leave encrypted personal data behind.
 */

/**
 * A question-page journey in progress (report, found, claim), kept between
 * pages without JavaScript. The browser holds only a random token in an
 * httpOnly cookie; the answers, which include contact details, are encrypted
 * in `data_enc` (lib/crypto/pii.ts, bound to the row id). Rows expire quickly
 * and are swept on each new journey, so an abandoned form does not keep a
 * person's details. `token_hash` is the SHA-256 of the cookie value.
 */
export const lostFoundJourneys = pgTable(
  "lost_found_journeys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tokenHash: text("token_hash").notNull().unique(),
    /** `lost`, `found` or `claim`. */
    journey: text("journey").notNull(),
    dataEnc: text("data_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("lost_found_journeys_expires_idx").on(t.expiresAt)],
);

/**
 * The detail only the owner would know, given with a lost report. Encrypted;
 * staff read it to check a claim against it. Never copied to the public
 * listing. Deleted with the reporter's contact row.
 */
export const lostFoundIdentifyingDetails = pgTable(
  "lost_found_identifying_details",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => caseContacts.id, { onDelete: "cascade" }),
    detailEnc: text("detail_enc").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lost_found_identifying_details_case_idx").on(t.caseId)],
);

export type LostFoundJourneyRow = typeof lostFoundJourneys.$inferSelect;
