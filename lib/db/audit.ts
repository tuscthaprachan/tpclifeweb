/**
 * Audit helpers. `recordAudit` inserts one row through whatever executor it is
 * given; `withAudit` opens a transaction and hands the callback an `audit`
 * function bound to it, so a write and its audit row commit or roll back
 * together. Never call `recordAudit` on the bare client for a write: pass the
 * transaction.
 *
 * No `server-only` import here so the helpers run under PGlite in tests; they
 * hold no secrets and take the database as a parameter.
 */

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { auditLog } from "./schema/audit-log";

/** Any Drizzle Postgres client or transaction (Neon, PGlite) using our schema. */
export type AuditExecutor = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Who did it, and from where. Constant for the whole request. */
export interface AuditContext {
  actorUserId?: string | null;
  actorOrganisationId?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** What happened. `action` is a dotted verb such as `staff_role.grant`. */
export interface AuditEntry extends AuditContext {
  action: string;
  entityType: string;
  entityId: string | number;
  before?: unknown;
  after?: unknown;
}

/** Insert one audit row using `tx`. */
export async function recordAudit(tx: AuditExecutor, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    actorUserId: entry.actorUserId ?? null,
    actorOrganisationId: entry.actorOrganisationId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: String(entry.entityId),
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    requestId: entry.requestId ?? null,
  });
}

/**
 * Run `fn` in a transaction with an `audit` function that inherits `context`.
 * If `fn` throws, the writes and every audit row roll back together.
 *
 *   await withAudit(db, ctx, async (tx, audit) => {
 *     const [row] = await tx.insert(...).returning();
 *     await audit({ action: "x.create", entityType: "x", entityId: row.id, after: row });
 *   });
 */
export async function withAudit<T>(
  db: AuditExecutor,
  context: AuditContext,
  fn: (tx: AuditExecutor, audit: (entry: AuditEntry) => Promise<void>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) =>
    fn(tx, (entry) => recordAudit(tx, { ...context, ...entry })),
  );
}
