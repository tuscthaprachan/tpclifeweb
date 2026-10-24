import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Recovery links: how a staff member who has lost every passkey gets back in.
 * An admin issues one from the staff page (or `npm run auth:bootstrap --
 * --recover <email>` does, with direct database access). Opening it lets the
 * person register a new passkey on their existing account.
 *
 * Like invites, only the SHA-256 of the token is stored. A link is pending
 * while `used_at` and `revoked_at` are null and `expires_at` is in the future.
 * `issued_by` is null for the command line path.
 */
export const staffRecoveryLinks = pgTable(
  "staff_recovery_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    issuedBy: text("issued_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("staff_recovery_links_user_idx").on(t.userId)],
);

export type StaffRecoveryLink = typeof staffRecoveryLinks.$inferSelect;
