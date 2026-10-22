import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organisations } from "./organisations";

/** The roles from docs/backend-plan.md. Each is held on behalf of one organisation. */
export const STAFF_ROLES = ["admin", "editor", "lf_officer", "complaints_handler", "unit_lead"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);

/**
 * Role grants. A revoked grant keeps its row (history); only one active grant
 * per user, role and organisation may exist, enforced by a partial unique index.
 */
export const staffRoles = pgTable(
  "staff_roles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: staffRoleEnum("role").notNull(),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("staff_roles_active_unique")
      .on(t.userId, t.role, t.organisationId)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export type StaffRoleGrant = typeof staffRoles.$inferSelect;
