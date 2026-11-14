import "server-only";

import { and, count, eq, gte, getTableColumns, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { listExtras } from "./list-extras";
import { parseListStatus, type ListStatus, type ListWithin, type SortDir, type SortKey } from "./list-query";
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
  /** The type's own date (news published, event start) when it has one. */
  date?: Date | null;
}

export const LIST_LIMIT = 200;

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export const LIST_PAGE_SIZE = 25;

/** The most rows one CSV export holds. */
export const EXPORT_LIMIT = 10000;

export { parseListStatus, type ListStatus };

/** The filters a list applies; `ListQuery` fits, and so does a partial one. */
export interface ListFilters {
  q?: string;
  status?: ListStatus;
  by?: string;
  within?: ListWithin;
  facet?: string;
}

const WITHIN_DAYS: Record<ListWithin, number> = { "7d": 7, "30d": 30 };

function listWhere(def: ContentTypeDef, filters: ListFilters, now: Date = new Date()): SQL | undefined {
  const { title, status: statusColumn, updatedAt } = def.columns;
  const term = filters.q?.trim();
  const search =
    term && title ? or(ilike(title[0], `%${escapeLike(term)}%`), ilike(title[1], `%${escapeLike(term)}%`)) : undefined;
  const byStatus =
    filters.status && statusColumn ? (filters.status === "published" ? eq(statusColumn, "published") : sql`${statusColumn} <> 'published'`) : undefined;
  const editor = filters.by ? (getTableColumns(def.table) as Record<string, AnyPgColumn>).updatedBy : undefined;
  const byEditor = filters.by && editor ? eq(editor, filters.by) : undefined;
  const since = filters.within ? gte(updatedAt, new Date(now.getTime() - WITHIN_DAYS[filters.within] * 86_400_000)) : undefined;
  const facet = listExtras(def).facet;
  const byFacet = filters.facet && facet && facet.options.some((o) => o.value === filters.facet) ? sql`${facet.column} = ${filters.facet}` : undefined;
  return and(def.where, search, byStatus, byEditor, since, byFacet);
}

/** The ORDER BY for a sort key. Ties break on the id so pages never repeat or skip a row. */
export function listOrder(def: ContentTypeDef, sort: SortKey, dir: SortDir, locale: "th" | "en" = "en"): SQL[] {
  const { id, title, status, updatedAt } = def.columns;
  const direction = dir === "asc" ? sql`asc` : sql`desc`;
  let primary: SQL;
  if (sort === "title" && title) {
    const [first, second] = locale === "th" ? title : [title[1], title[0]];
    primary = sql`lower(coalesce(nullif(${first}, ''), ${second})) ${direction}`;
  } else if (sort === "status" && status) {
    primary = sql`${status}::text ${direction}`;
  } else if (sort === "date" && listExtras(def).date) {
    primary = sql`${listExtras(def).date!.column} ${direction} nulls last`;
  } else {
    primary = sql`${updatedAt} ${direction}`;
  }
  return [primary, sql`${id} asc`];
}

/**
 * Filtered, sorted rows (newest edits first by default). `page` (1-based) with
 * `limit` as the page size pages the result; `withEditor` also looks up who
 * made each last edit and each public address name.
 */
export async function listContentRows(
  db: AuditExecutor,
  def: ContentTypeDef,
  options: ListFilters & { limit?: number; page?: number; sort?: SortKey; dir?: SortDir; locale?: "th" | "en"; withEditor?: boolean } = {},
): Promise<{ rows: ContentListRow[]; total: number }> {
  const { id, title, status, updatedAt } = def.columns;
  const where = listWhere(def, options);
  const limit = options.limit ?? LIST_LIMIT;
  const page = Math.max(1, options.page ?? 1);
  const tableColumns = getTableColumns(def.table) as Record<string, AnyPgColumn>;
  const editorColumn = options.withEditor ? tableColumns.updatedBy : undefined;
  const slugColumn = options.withEditor ? tableColumns.slug : undefined;
  const dateColumn = listExtras(def).date?.column;

  const rows = await db
    .select({
      id,
      titleTh: title?.[0] ?? sql<string>`''`,
      titleEn: title?.[1] ?? sql<string>`''`,
      status: status ?? sql<null>`null`,
      updatedAt,
      updatedBy: editorColumn ?? sql<null>`null`,
      slug: slugColumn ?? sql<null>`null`,
      date: dateColumn ?? sql<null>`null`,
    })
    .from(def.table)
    .where(where)
    .orderBy(...listOrder(def, options.sort ?? "updated", options.dir ?? "desc", options.locale))
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
      date: r.date ? new Date(r.date as Date) : null,
    })),
  };
}

/** Staff who have edited rows of this type, for the "edited by" filter. */
export async function listEditors(db: AuditExecutor, def: ContentTypeDef): Promise<{ id: string; name: string }[]> {
  const editor = (getTableColumns(def.table) as Record<string, AnyPgColumn>).updatedBy;
  if (!editor) return [];
  const rows = await db.selectDistinct({ id: editor }).from(def.table).where(def.where);
  const names = await userNames(db, rows.map((r) => r.id as string | null));
  return [...names.entries()].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name));
}

/** The staff member's most recent edits across the given types, newest first. */
export async function recentEditsBy(
  db: AuditExecutor,
  defs: readonly ContentTypeDef[],
  userId: string,
  limit = 8,
): Promise<{ def: ContentTypeDef; row: ContentListRow }[]> {
  const perType = await Promise.all(
    defs
      .filter((d) => d.kind === "collection" && d.columns.title && (getTableColumns(d.table) as Record<string, AnyPgColumn>).updatedBy)
      .map(async (def) => {
        const { rows } = await listContentRows(db, def, { by: userId, limit, withEditor: true });
        return rows.map((row) => ({ def, row }));
      }),
  );
  return perType.flat().sort((x, y) => y.row.updatedAt.getTime() - x.row.updatedAt.getTime()).slice(0, limit);
}

/** Rows per status for a list's filter chips, honouring every filter except status. */
export async function countByStatus(db: AuditExecutor, def: ContentTypeDef, filters: ListFilters | string = {}): Promise<{ all: number; published: number; draft: number }> {
  const status = def.columns.status;
  const [row] = await db
    .select({
      all: count(),
      published: status ? sql<number>`count(*) filter (where ${status} = 'published')`.mapWith(Number) : count(),
    })
    .from(def.table)
    .where(listWhere(def, { ...(typeof filters === "string" ? { q: filters } : filters), status: undefined }));
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
