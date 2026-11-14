/**
 * Reads of the audit log for the viewer, the record history panel, the CSV
 * export and the dashboard feed. Every read goes through `visibleCondition`, so
 * a complaint in a restricted category is never listed to someone who is not
 * named on its category, whatever their role.
 */

import { and, count, desc, eq, gte, ilike, isNull, lt, sql, type SQL } from "drizzle-orm";
import { csvText } from "@/lib/open-data/csv";
import { addDays, dayStart, isDayKey } from "@/lib/borrowing/time";
import { caseVisibleTo } from "@/lib/cases/restrictions";
import type { AuditExecutor } from "@/lib/db/audit";
import { auditLog } from "@/lib/db/schema/audit-log";
import { user } from "@/lib/db/schema/auth";
import { cases } from "@/lib/db/schema/cases";


export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_EXPORT_LIMIT = 20000;
export const AUDIT_SYSTEM_ACTOR = "system";

export interface AuditFilters {
  /** A user id, or `system` for entries with no actor. */
  actor?: string;
  /** Matches actions that start with this text. */
  action?: string;
  entityType?: string;
  entityId?: string;
  /** `YYYY-MM-DD` in Bangkok, inclusive. */
  from?: string;
  to?: string;
  /** Free text, matched anywhere in the entity id. */
  q?: string;
  page: number;
}

export interface AuditEntry {
  id: number;
  occurredAt: Date;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed.slice(0, 200) : undefined;
};

/** Reads the query string. Anything malformed is dropped, never an error. */
export function parseAuditFilters(params: Params): AuditFilters {
  const from = first(params.from);
  const to = first(params.to);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    actor: first(params.actor),
    action: first(params.action),
    entityType: first(params.entityType),
    entityId: first(params.entityId),
    from: isDayKey(from) ? from : undefined,
    to: isDayKey(to) ? to : undefined,
    q: first(params.q),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The filters as a query string without the page, for links and the export. */
export function auditFilterParams(filters: AuditFilters): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of ["actor", "action", "entityType", "entityId", "from", "to", "q"] as const) {
    const value = filters[key];
    if (value) sp.set(key, value);
  }
  return sp;
}

export function hasAuditFilters(filters: AuditFilters): boolean {
  return auditFilterParams(filters).size > 0;
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Entries about a case are listed only when the viewer may see that case. */
export function visibleCondition(viewerUserId: string): SQL {
  return sql`(${auditLog.entityType} <> 'case' or exists (select 1 from ${cases} where ${cases.id}::text = ${auditLog.entityId} and ${caseVisibleTo(viewerUserId)}))`;
}

export function auditConditions(filters: AuditFilters, viewerUserId: string): SQL[] {
  const out: (SQL | undefined)[] = [visibleCondition(viewerUserId)];
  if (filters.actor) out.push(filters.actor === AUDIT_SYSTEM_ACTOR ? isNull(auditLog.actorUserId) : eq(auditLog.actorUserId, filters.actor));
  if (filters.action) out.push(ilike(auditLog.action, `${escapeLike(filters.action)}%`));
  if (filters.entityType) out.push(eq(auditLog.entityType, filters.entityType));
  if (filters.entityId) out.push(eq(auditLog.entityId, filters.entityId));
  if (filters.from) out.push(gte(auditLog.occurredAt, dayStart(filters.from)));
  if (filters.to) out.push(lt(auditLog.occurredAt, dayStart(addDays(filters.to, 1))));
  if (filters.q) out.push(ilike(auditLog.entityId, `%${escapeLike(filters.q)}%`));
  return out.filter((c): c is SQL => c !== undefined);
}

const selection = {
  id: auditLog.id,
  occurredAt: auditLog.occurredAt,
  actorUserId: auditLog.actorUserId,
  actorName: user.name,
  actorEmail: user.email,
  action: auditLog.action,
  entityType: auditLog.entityType,
  entityId: auditLog.entityId,
  before: auditLog.before,
  after: auditLog.after,
  ip: auditLog.ip,
  userAgent: auditLog.userAgent,
  requestId: auditLog.requestId,
};

export interface AuditPage {
  rows: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Newest first. */
export async function listAuditEntries(db: AuditExecutor, filters: AuditFilters, viewerUserId: string, pageSize = AUDIT_PAGE_SIZE): Promise<AuditPage> {
  const where = and(...auditConditions(filters, viewerUserId));
  const [totals] = await db.select({ n: count() }).from(auditLog).where(where);
  const total = totals?.n ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, lastPage);
  const rows = await db
    .select(selection)
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(where)
    .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageSize };
}

/** The latest entries about one record, for the history panel. */
export async function recordHistory(db: AuditExecutor, entityType: string, entityId: string, viewerUserId: string, limit = 20): Promise<AuditEntry[]> {
  return db
    .select(selection)
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId), visibleCondition(viewerUserId)))
    .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
    .limit(limit);
}

export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

/** Everyone who appears as an actor, for the filter's staff picker. */
export async function listAuditActors(db: AuditExecutor): Promise<AuditActor[]> {
  const rows = await db
    .selectDistinct({ id: user.id, name: user.name, email: user.email })
    .from(auditLog)
    .innerJoin(user, eq(user.id, auditLog.actorUserId))
    .orderBy(user.name)
    .limit(500);
  return rows;
}

export async function listAuditEntityTypes(db: AuditExecutor): Promise<string[]> {
  const rows = await db.selectDistinct({ entityType: auditLog.entityType }).from(auditLog).orderBy(auditLog.entityType).limit(200);
  return rows.map((r) => r.entityType);
}

const CSV_COLUMNS = ["occurred_at", "actor_id", "actor_name", "action", "entity_type", "entity_id", "ip", "user_agent", "request_id", "before", "after"] as const;

/** A cell that a spreadsheet could read as a formula is prefixed so it is shown as text. */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const json = (value: unknown) => (value === null || value === undefined ? "" : JSON.stringify(value));

/** UTF-8 CSV with a byte order mark, one row per entry, newest first. */
export function auditCsv(rows: readonly AuditEntry[]): string {
  return csvText({
    columns: CSV_COLUMNS,
    rows: rows.map((r) =>
      [r.occurredAt.toISOString(), r.actorUserId ?? "", r.actorName ?? "", r.action, r.entityType, r.entityId, r.ip ?? "", r.userAgent ?? "", r.requestId ?? "", json(r.before), json(r.after)].map(safeCell),
    ),
  });
}

export async function exportAuditEntries(db: AuditExecutor, filters: AuditFilters, viewerUserId: string, limit = AUDIT_EXPORT_LIMIT): Promise<AuditEntry[]> {
  return db
    .select(selection)
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(and(...auditConditions(filters, viewerUserId)))
    .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
    .limit(limit);
}


