import { pgEnum, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * The three staff roles. `admin` does everything, `editor` manages all website
 * content and open data for both bodies, `officer` works the case services
 * (lost and found, complaints, borrowing) and sees performance.
 */
export const STAFF_ROLES = ["admin", "editor", "officer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);

/**
 * Role grants. A revoked grant keeps its row (history); only one active grant
 * per user and role may exist, enforced by a partial unique index. Which body
 * a person belongs to is `staff_memberships`, not part of the role.
 */
export const staffRoles = pgTable(
  "staff_roles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: staffRoleEnum("role").notNull(),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("staff_roles_active_unique")
      .on(t.userId, t.role)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export type StaffRoleGrant = typeof staffRoles.$inferSelect;
