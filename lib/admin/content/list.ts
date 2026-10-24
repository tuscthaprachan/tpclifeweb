import "server-only";

import { and, count, desc, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import type { ContentTypeDef } from "./types";

/** One row of a list page or a picker. */
export interface ContentListRow {
  id: string;
  title: { th: string; en: string };
  /** Null for types without a draft/published status (images). */
  status: ContentStatus | null;
  updatedAt: Date;
}

export const LIST_LIMIT = 200;

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Newest edits first, optionally filtered by text in either title. */
export async function listContentRows(
  db: AuditExecutor,
  def: ContentTypeDef,
  options: { q?: string; limit?: number } = {},
): Promise<{ rows: ContentListRow[]; total: number }> {
  const { id, title, status, updatedAt } = def.columns;
  const q = options.q?.trim();
  const search =
    q && title ? or(ilike(title[0], `%${escapeLike(q)}%`), ilike(title[1], `%${escapeLike(q)}%`)) : undefined;
  const where = and(def.where, search);

  const rows = await db
    .select({
      id,
      titleTh: title?.[0] ?? sql<string>`''`,
      titleEn: title?.[1] ?? sql<string>`''`,
      status: status ?? sql<null>`null`,
      updatedAt,
    })
    .from(def.table)
    .where(where)
    .orderBy(desc(updatedAt))
    .limit(options.limit ?? LIST_LIMIT);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(def.table).where(where);

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id as string,
      title: { th: String(r.titleTh ?? ""), en: String(r.titleEn ?? "") },
      status: (r.status as ContentStatus | null) ?? null,
      updatedAt: new Date(r.updatedAt as Date),
    })),
  };
}

export interface ContentCount {
  total: number;
  /** Rows that are live; equals `total` for types with no status. */
  published: number;
}

/** Row counts per registry key, for the hub. One query per type, run together. */
export async function countContentTypes(db: AuditExecutor, defs: readonly ContentTypeDef[]): Promise<Map<string, ContentCount>> {
  const entries = await Promise.all(
    defs
      .filter((d) => d.kind === "collection")
      .map(async (def): Promise<[string, ContentCount]> => {
        const status = def.columns.status;
        const [row] = await db
          .select({
            total: count(),
            published: status ? sql<number>`count(*) filter (where ${status} = 'published')`.mapWith(Number) : count(),
          })
          .from(def.table)
          .where(def.where as SQL | undefined);
        return [def.key, { total: row?.total ?? 0, published: row?.published ?? 0 }];
      }),
  );
  return new Map(entries);
}

/** Every row of a type as a pick-list entry, for `ReferencePicker`. Capped at 1000. */
export async function loadChoices(db: AuditExecutor, def: ContentTypeDef): Promise<{ value: string; label: { th: string; en: string } }[]> {
  const { rows } = await listContentRows(db, def, { limit: 1000 });
  return rows.map((r) => ({ value: r.id, label: r.title }));
}

/** Display names for user ids (the `updatedBy` columns). Unknown ids are absent. */
export async function userNames(db: AuditExecutor, ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();
  const rows = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, wanted));
  return new Map(rows.map((r) => [r.id, r.name || r.email]));
}
