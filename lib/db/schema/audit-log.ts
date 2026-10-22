import { bigint, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * Append-only audit trail. A migration installs triggers that reject UPDATE,
 * DELETE and TRUNCATE, so rows can only ever be added.
 *
 * `actor_user_id` is deliberately not a foreign key: the log must outlive the
 * user it describes (deleting a user for PDPA reasons must not touch or be
 * blocked by history). It is null for system actions such as scheduled jobs.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: text("actor_user_id"),
    actorOrganisationId: integer("actor_organisation_id").references(() => organisations.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorUserId),
    index("audit_log_occurred_at_idx").on(t.occurredAt),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;
