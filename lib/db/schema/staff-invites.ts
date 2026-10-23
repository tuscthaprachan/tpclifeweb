import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organisations } from "./organisations";
import { staffRoleEnum } from "./staff-roles";

/**
 * Pending and historical staff invitations. The invite is the authorisation:
 * whoever proves they own `email` and opens the link receives `roles` on
 * behalf of `organisation_id`.
 *
 * Only the SHA-256 of the token is stored (`token_hash`), so a database leak
 * cannot be turned into working invite links. The raw token exists in the
 * emailed link alone. An invite is pending while `accepted_at` and
 * `revoked_at` are null and `expires_at` is in the future.
 *
 * `invited_by` is null for the one-off bootstrap invite made by
 * `npm run auth:bootstrap`, which has no inviting user.
 */
export const staffInvites = pgTable(
  "staff_invites",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: text("email").notNull(),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id),
    roles: staffRoleEnum("roles").array().notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("staff_invites_email_idx").on(t.email)],
);

export type StaffInvite = typeof staffInvites.$inferSelect;
