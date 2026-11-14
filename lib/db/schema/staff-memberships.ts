import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organisations } from "./organisations";

/**
 * Which of the two bodies (TUSU, TUSC) a member of staff belongs to. A person
 * may belong to either or both; every action they take is attributed to one
 * of them. Roles are held by the person and are not scoped to a body.
 */
export const staffMemberships = pgTable(
  "staff_memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id),
    addedBy: text("added_by").references(() => user.id, { onDelete: "set null" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organisationId] })],
);

export type StaffMembership = typeof staffMemberships.$inferSelect;
