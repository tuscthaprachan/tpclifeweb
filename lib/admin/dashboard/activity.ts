import { and, desc, eq, ilike, inArray, not, or, sql, type SQL } from "drizzle-orm";
import { CONTENT_TABLE_NAMES } from "@/lib/admin/audit/describe";
import { visibleCondition } from "@/lib/admin/audit/query";
import { hasRole, type ActiveRole } from "@/lib/auth/roles";
import type { AuditExecutor } from "@/lib/db/audit";
import { auditLog } from "@/lib/db/schema/audit-log";
import { user } from "@/lib/db/schema/auth";
import { cases } from "@/lib/db/schema/cases";

export interface ActivityItem {
  id: number;
  occurredAt: Date;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  /** The case reference, for entries about a case. */
  entityLabel: string | null;
}

/** Which entries a role may see on the dashboard. `all` is the administrator's. */
export interface ActivityScope {
  all: boolean;
  actionPrefixes: string[];
  entityTypes: string[];
}

const CASE_PREFIXES = ["case.", "case_", "complaint.", "lost_found", "borrowing."];
const CONTENT_ENTITIES = [...CONTENT_TABLE_NAMES, "images"];

/** Administrators see everything, editors content, officers case work. Someone with several roles sees the union. */
export function activityScope(roles: readonly ActiveRole[]): ActivityScope {
  if (hasRole(roles, "admin")) return { all: true, actionPrefixes: [], entityTypes: [] };
  const scope: ActivityScope = { all: false, actionPrefixes: [], entityTypes: [] };
  if (hasRole(roles, "editor")) scope.entityTypes.push(...CONTENT_ENTITIES);
  if (hasRole(roles, "officer")) scope.actionPrefixes.push(...CASE_PREFIXES);
  return scope;
}

const likePrefix = (prefix: string) => `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function scopeCondition(scope: ActivityScope): SQL | undefined {
  if (scope.all) return undefined;
  const parts: SQL[] = [];
  if (scope.entityTypes.length > 0) parts.push(inArray(auditLog.entityType, scope.entityTypes));
  for (const prefix of scope.actionPrefixes) parts.push(ilike(auditLog.action, likePrefix(prefix)));
  return parts.length > 0 ? or(...parts) : sql`false`;
}

/**
 * The newest entries the viewer may see. Reading a record is not activity, so
 * `view` actions are left out, and a complaint in a restricted category never
 * appears for someone who is not named on it.
 */
export async function loadRecentActivity(db: AuditExecutor, input: { userId: string; roles: readonly ActiveRole[]; limit?: number }): Promise<ActivityItem[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      occurredAt: auditLog.occurredAt,
      actorUserId: auditLog.actorUserId,
      actorName: user.name,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(and(visibleCondition(input.userId), not(ilike(auditLog.action, "%view%")), scopeCondition(activityScope(input.roles))))
    .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
    .limit(input.limit ?? 10);

  const caseIds = [...new Set(rows.filter((r) => r.entityType === "case").map((r) => r.entityId))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const references = new Map<string, string>();
  if (caseIds.length > 0) {
    for (const c of await db.select({ id: cases.id, reference: cases.reference }).from(cases).where(inArray(cases.id, caseIds))) references.set(c.id, c.reference);
  }
  return rows.map((r) => ({ ...r, entityLabel: r.entityType === "case" ? (references.get(r.entityId) ?? null) : null }));
}
