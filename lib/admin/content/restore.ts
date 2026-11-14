import { eq, getTableColumns, getTableName } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { getDb } from "@/lib/db";
import type { ContentActor } from "./access";
import { restorableRow } from "./diff";
import { getRevision } from "./history";
import { lifecycleType } from "./lifecycle";
import { ContentNotFoundError, saveContent, type ContentTable } from "./save";

/** The revision does not exist, or records a deletion and so has nothing to restore. */
export class RevisionNotRestorableError extends Error {
  constructor() {
    super("Revision cannot be restored");
    this.name = "RevisionNotRestorableError";
  }
}

const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Writes a past revision back as the current row, as a new revision (history
 * is never rewritten). The row is saved as a draft unless `publish` is set.
 * The publication window is cleared, so a restored item never comes back
 * already expired or waiting on an old date. Throws `ContentNotFoundError`,
 * `RevisionNotRestorableError`, `ContentConflictError` (the revision's slug
 * is now another item's) or `ContentInUseError` (it points at something since
 * deleted).
 */
export async function restoreRevision(input: {
  segment: string;
  id: string;
  revisionNumber: number;
  publish: boolean;
  actor: ContentActor;
  db?: AuditExecutor;
  now?: Date;
}): Promise<{ id: string; revisionNumber: number }> {
  const found = lifecycleType(input.segment);
  if (!found) throw new ContentNotFoundError();
  const { def, life } = found;
  const table = def.table as ContentTable;
  const db = input.db ?? getDb();
  const name = getTableName(table);

  return withAudit(db, input.actor.context, async (tx, audit) => {
    const [current] = await tx.select({ id: table.id }).from(table).where(eq(table.id, input.id)).limit(1);
    if (!current) throw new ContentNotFoundError();
    const revision = await getRevision(tx, def, input.id, input.revisionNumber);
    const snapshot = revision?.revision as { deleted?: boolean } | undefined;
    const stored = restorableRow(snapshot);
    if (!revision || snapshot?.deleted || !stored) throw new RevisionNotRestorableError();

    const columns = getTableColumns(table) as Record<string, { dataType: string }>;
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(stored)) {
      const column = columns[key];
      if (!column || ["status", "publishedAt", "publishAt", "unpublishAt"].includes(key)) continue;
      values[key] = column.dataType === "date" && typeof value === "string" ? toDate(value) : value;
    }
    values.publishAt = null;
    values.unpublishAt = null;
    if (input.publish) values.publishedAt = toDate(stored.publishedAt) ?? undefined;
    if (!("publishAt" in columns)) {
      delete values.publishAt;
      delete values.unpublishAt;
    }

    const saved = await saveContent({
      entityType: def.entityType,
      table,
      actor: input.actor,
      db: tx,
      id: input.id,
      now: input.now,
      status: input.publish ? "published" : "draft",
      values,
      children: async (child, id) => {
        const written: Record<string, unknown> = {};
        for (const c of life.children) {
          const rows = Array.isArray((snapshot as Record<string, unknown>)[c.key]) ? ((snapshot as Record<string, unknown[]>)[c.key] as Record<string, unknown>[]) : [];
          await child.delete(c.table).where(eq(c.fk, id));
          const restored = rows.map((r) => ({ ...r, [c.fkKey]: id }));
          if (restored.length > 0) await child.insert(c.table).values(restored);
          written[c.key] = restored;
        }
        return written;
      },
    });

    await audit({
      action: `${name}.restore`,
      entityType: name,
      entityId: input.id,
      before: { revisionNumber: input.revisionNumber },
      after: { published: input.publish, status: saved.row.status },
    });
    return { id: input.id, revisionNumber: input.revisionNumber };
  });
}
