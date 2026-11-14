import { eq, getTableColumns, getTableName } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { getDb } from "@/lib/db";
import type { ContentActor } from "./access";
import { lifecycleType } from "./lifecycle";
import { ContentNotFoundError, saveContent, type ContentTable } from "./save";
import { SLUG_MAX, isSlugTaken } from "./slug";

export const COPY_SUFFIX = { th: " (สำเนา)", en: " (copy)" } as const;

const DROPPED = ["id", "createdAt", "updatedAt", "createdBy", "updatedBy", "status", "publishedAt", "publishAt", "unpublishAt"];

/** `base-copy`, then `base-copy-2`, `base-copy-3`... the first that `taken` says is free. */
export async function uniqueCopySlug(slug: string, taken: (candidate: string) => Promise<boolean>): Promise<string> {
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? "-copy" : `-copy-${n}`;
    const candidate = `${slug.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
}

/**
 * Creates a draft copy of a row: titles end " (copy)" (" (สำเนา)" in Thai), the
 * slug is made unique, status is draft and the publication dates are cleared.
 * Child rows (tags, gallery, forms...) are copied. One transaction with the
 * insert's own audit entry, revision and a `<table>.duplicate` audit entry.
 */
export async function duplicateContent(input: {
  segment: string;
  id: string;
  actor: ContentActor;
  db?: AuditExecutor;
}): Promise<{ id: string }> {
  const found = lifecycleType(input.segment);
  if (!found) throw new ContentNotFoundError();
  const { def, life } = found;
  const table = def.table as ContentTable;
  const db = input.db ?? getDb();
  const name = getTableName(table);

  return withAudit(db, input.actor.context, async (tx, audit) => {
    const [source] = (await tx.select().from(table).where(eq(table.id, input.id)).limit(1)) as Record<string, unknown>[];
    if (!source) throw new ContentNotFoundError();

    const values: Record<string, unknown> = {};
    const columns = getTableColumns(table);
    for (const key of Object.keys(columns)) {
      if (!DROPPED.includes(key)) values[key] = source[key];
    }

    const [thKey, enKey] = life.titleKeys;
    values[thKey] = `${String(source[thKey] ?? "")}${COPY_SUFFIX.th}`;
    values[enKey] = `${String(source[enKey] ?? "")}${COPY_SUFFIX.en}`;

    if (life.slugKey && typeof source[life.slugKey] === "string" && source[life.slugKey] !== "") {
      const slugColumn = (columns as Record<string, (typeof columns)[string]>)[life.slugKey]!;
      values[life.slugKey] = await uniqueCopySlug(source[life.slugKey] as string, (candidate) =>
        isSlugTaken(tx, { table, slugColumn, idColumn: table.id, slug: candidate, where: def.where }),
      );
    }

    const saved = await saveContent({
      entityType: def.entityType,
      table,
      actor: input.actor,
      db: tx,
      values,
      children: async (child, newId) => {
        const written: Record<string, unknown> = {};
        for (const c of life.children) {
          const rows = (await child.select().from(c.table).where(eq(c.fk, input.id))) as Record<string, unknown>[];
          const copies = rows.map(({ id: _id, ...rest }) => ({ ...rest, [c.fkKey]: newId }));
          if (copies.length > 0) await child.insert(c.table).values(copies);
          written[c.key] = copies;
        }
        return written;
      },
    });

    await audit({ action: `${name}.duplicate`, entityType: name, entityId: saved.id, before: { sourceId: input.id }, after: { id: saved.id } });
    return { id: saved.id };
  });
}
