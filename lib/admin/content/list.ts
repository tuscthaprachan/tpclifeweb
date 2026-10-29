import "server-only";

import { and, count, desc, eq, getTableColumns, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
  /** Who made the last edit; only filled when the caller asks for it. */
  updatedByName?: string;
  /** The public web address name; only filled when the caller asks for editor details and the type has a public page. */
  slug?: string;
}

export const LIST_LIMIT = 200;

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export const LIST_PAGE_SIZE = 25;

export type ListStatus = "published" | "draft";

/** Reads `?status=`; anything else is "all" (undefined). */
export function parseListStatus(value: string | undefined): ListStatus | undefined {
  return value === "published" || value === "draft" ? value : undefined;
}

function listWhere(def: ContentTypeDef, q: string | undefined, status: ListStatus | undefined): SQL | undefined {
  const { title, status: statusColumn } = def.columns;
  const term = q?.trim();
  const search =
    term && title ? or(ilike(title[0], `%${escapeLike(term)}%`), ilike(title[1], `%${escapeLike(term)}%`)) : undefined;
  const byStatus = status && statusColumn ? (status === "published" ? eq(statusColumn, "published") : sql`${statusColumn} <> 'published'`) : undefined;
  return and(def.where, search, byStatus);
}

/**
 * Newest edits first, optionally filtered by text in either title and by
 * status. `page` (1-based) with `limit` as the page size pages the result;
 * `withEditor` also looks up who made each last edit and each public address name.
 */
export async function listContentRows(
  db: AuditExecutor,
  def: ContentTypeDef,
  options: { q?: string; limit?: number; page?: number; status?: ListStatus; withEditor?: boolean } = {},
): Promise<{ rows: ContentListRow[]; total: number }> {
  const { id, title, status, updatedAt } = def.columns;
  const where = listWhere(def, options.q, options.status);
  const limit = options.limit ?? LIST_LIMIT;
  const page = Math.max(1, options.page ?? 1);
  const tableColumns = getTableColumns(def.table) as Record<string, AnyPgColumn>;
  const editorColumn = options.withEditor ? tableColumns.updatedBy : undefined;
  const slugColumn = options.withEditor && def.viewPath ? tableColumns.slug : undefined;

  const rows = await db
    .select({
      id,
      titleTh: title?.[0] ?? sql<string>`''`,
      titleEn: title?.[1] ?? sql<string>`''`,
      status: status ?? sql<null>`null`,
      updatedAt,
      updatedBy: editorColumn ?? sql<null>`null`,
      slug: slugColumn ?? sql<null>`null`,
    })
    .from(def.table)
    .where(where)
    .orderBy(desc(updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(def.table).where(where);
  const names = editorColumn ? await userNames(db, rows.map((r) => r.updatedBy as string | null)) : new Map<string, string>();

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id as string,
      title: { th: String(r.titleTh ?? ""), en: String(r.titleEn ?? "") },
      status: (r.status as ContentStatus | null) ?? null,
      updatedAt: new Date(r.updatedAt as Date),
      updatedByName: r.updatedBy ? names.get(r.updatedBy as string) : undefined,
      slug: r.slug ? String(r.slug) : undefined,
    })),
  };
}

/** Rows per status for a list's filter chips, honouring the text filter. */
export async function countByStatus(db: AuditExecutor, def: ContentTypeDef, q?: string): Promise<{ all: number; published: number; draft: number }> {
  const status = def.columns.status;
  const [row] = await db
    .select({
      all: count(),
      published: status ? sql<number>`count(*) filter (where ${status} = 'published')`.mapWith(Number) : count(),
    })
    .from(def.table)
    .where(listWhere(def, q, undefined));
  const all = row?.all ?? 0;
  const published = row?.published ?? 0;
  return { all, published, draft: all - published };
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
