import { and, desc, eq, getTableName, inArray } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { contentRevisions, user, type ContentRevisionRow } from "@/lib/db/schema";
import type { ContentTypeDef } from "./types";

export interface RevisionSummary {
  id: string;
  revisionNumber: number;
  createdAt: Date;
  createdByName: string | null;
  /** Status of the row at that revision, or null for a deletion record. */
  status: string | null;
  deleted: boolean;
}

const statusOf = (revision: unknown): string | null => {
  const row = (revision as { row?: { status?: unknown } } | null)?.row;
  return typeof row?.status === "string" ? row.status : null;
};

/** Newest first. */
export async function listRevisions(db: AuditExecutor, def: Pick<ContentTypeDef, "table">, entityId: string): Promise<RevisionSummary[]> {
  const entityType = getTableName(def.table);
  const rows = await db
    .select()
    .from(contentRevisions)
    .where(and(eq(contentRevisions.entityType, entityType), eq(contentRevisions.entityId, entityId)))
    .orderBy(desc(contentRevisions.revisionNumber));
  const ids = [...new Set(rows.map((r) => r.createdBy).filter((id): id is string => Boolean(id)))];
  const people = ids.length > 0 ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, ids)) : [];
  const names = new Map(people.map((p) => [p.id, p.name || p.email]));
  return rows.map((r) => ({
    id: r.id,
    revisionNumber: r.revisionNumber,
    createdAt: r.createdAt,
    createdByName: r.createdBy ? (names.get(r.createdBy) ?? null) : null,
    status: statusOf(r.revision),
    deleted: (r.revision as { deleted?: unknown } | null)?.deleted === true,
  }));
}

export async function getRevision(
  db: AuditExecutor,
  def: Pick<ContentTypeDef, "table">,
  entityId: string,
  revisionNumber: number,
): Promise<ContentRevisionRow | undefined> {
  const [row] = await db
    .select()
    .from(contentRevisions)
    .where(
      and(
        eq(contentRevisions.entityType, getTableName(def.table)),
        eq(contentRevisions.entityId, entityId),
        eq(contentRevisions.revisionNumber, revisionNumber),
      ),
    )
    .limit(1);
  return row;
}

export async function latestRevision(db: AuditExecutor, def: Pick<ContentTypeDef, "table">, entityId: string): Promise<ContentRevisionRow | undefined> {
  const [row] = await db
    .select()
    .from(contentRevisions)
    .where(and(eq(contentRevisions.entityType, getTableName(def.table)), eq(contentRevisions.entityId, entityId)))
    .orderBy(desc(contentRevisions.revisionNumber))
    .limit(1);
  return row;
}

