import { and, asc, count, desc, eq, gte, ilike, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { images, type ImageRow } from "@/lib/db/schema";
import { scanImageUsage, type ImageUse, type ImageUsageMap } from "./usage";

export const LIBRARY_PAGE_SIZE = 24;

export const LIBRARY_SORTS = ["newest", "oldest", "name", "size"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export type LibraryView = "grid" | "table";
export type LibraryWithin = "7d" | "30d" | "90d";

export interface LibraryQuery {
  q?: string;
  view: LibraryView;
  missingAlt: boolean;
  unused: boolean;
  by?: string;
  within?: LibraryWithin;
  sort: LibrarySort;
  page: number;
}

export type RawLibraryParams = Partial<Record<"q" | "view" | "alt" | "unused" | "by" | "within" | "sort" | "page", string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const WITHIN_DAYS: Record<LibraryWithin, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Reads the library's query string. Anything unrecognised falls back to the default. */
export function parseLibraryQuery(raw: RawLibraryParams): LibraryQuery {
  const sort = one(raw.sort);
  const within = one(raw.within);
  return {
    q: one(raw.q)?.trim() || undefined,
    view: one(raw.view) === "table" ? "table" : "grid",
    missingAlt: one(raw.alt) === "missing",
    unused: one(raw.unused) === "1",
    by: one(raw.by)?.trim() || undefined,
    within: within === "7d" || within === "30d" || within === "90d" ? within : undefined,
    sort: (LIBRARY_SORTS as readonly string[]).includes(sort ?? "") ? (sort as LibrarySort) : "newest",
    page: Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1),
  };
}

/** The query as URL parameters, leaving out defaults. `over` changes some of them. */
export function libraryParams(query: LibraryQuery, over: Partial<Record<keyof LibraryQuery, unknown>> = {}): Record<string, string | undefined> {
  const q = { ...query, ...over } as LibraryQuery;
  return {
    q: q.q,
    view: q.view === "table" ? "table" : undefined,
    alt: q.missingAlt ? "missing" : undefined,
    unused: q.unused ? "1" : undefined,
    by: q.by,
    within: q.within,
    sort: q.sort === "newest" ? undefined : q.sort,
    page: q.page > 1 ? String(q.page) : undefined,
  };
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Not decorative, and no description in Thai or in English. */
export const needsAlt = sql`(${images.isDecorative} = false and (btrim(${images.altTh}) = '' or btrim(${images.altEn}) = ''))`;

export function isMissingAlt(row: Pick<ImageRow, "isDecorative" | "altTh" | "altEn">): boolean {
  return !row.isDecorative && (!row.altTh.trim() || !row.altEn.trim());
}

/** The file's name: the last part of its storage key. */
export const imageFileName = (storageKey: string) => storageKey.slice(storageKey.lastIndexOf("/") + 1);

export interface LibraryRow {
  image: ImageRow;
  uses: ImageUse[];
}

export interface LibraryPage {
  rows: LibraryRow[];
  total: number;
  totalPages: number;
  allTotal: number;
  /** Pictures that need a description, across the whole library. */
  missingTotal: number;
  unusedTotal: number;
  usage: ImageUsageMap;
}

/**
 * One page of the library. Usage is scanned once per request; the "unused"
 * filter excludes every used id in SQL. Filename matches the stored file name,
 * and also alt text and caption. "Size" orders by pixel count, since file
 * sizes are not stored.
 */
export async function listLibrary(db: AuditExecutor, query: LibraryQuery, now: Date = new Date()): Promise<LibraryPage> {
  const usage = await scanImageUsage(db);
  const usedIds = [...usage.keys()];

  const like = query.q ? `%${escapeLike(query.q)}%` : undefined;
  const search = like
    ? or(ilike(images.altTh, like), ilike(images.altEn, like), ilike(images.captionTh, like), ilike(images.captionEn, like), ilike(images.storageKey, like))
    : undefined;
  const by = query.by ? eq(images.createdBy, query.by) : undefined;
  const since = query.within ? gte(images.createdAt, new Date(now.getTime() - WITHIN_DAYS[query.within] * 86_400_000)) : undefined;
  const unusedCond: SQL | undefined = usedIds.length > 0 ? notInArray(images.id, usedIds) : undefined;

  const base = and(search, by, since);
  const where = and(base, query.missingAlt ? needsAlt : undefined, query.unused ? unusedCond : undefined);

  const order =
    query.sort === "oldest"
      ? [asc(images.createdAt), asc(images.id)]
      : query.sort === "name"
        ? [asc(sql`lower(${images.altEn})`), asc(sql`lower(${images.altTh})`), asc(images.storageKey)]
        : query.sort === "size"
          ? [desc(sql`coalesce(${images.width}::bigint * ${images.height}, 0)`), desc(images.createdAt)]
          : [desc(images.createdAt), desc(images.id)];

  const [rows, [totalRow], [allRow], [missingRow], [unusedRow]] = await Promise.all([
    db.select().from(images).where(where).orderBy(...order).limit(LIBRARY_PAGE_SIZE).offset((query.page - 1) * LIBRARY_PAGE_SIZE),
    db.select({ n: count() }).from(images).where(where),
    db.select({ n: count() }).from(images).where(base),
    db.select({ n: count() }).from(images).where(and(base, needsAlt)),
    db.select({ n: count() }).from(images).where(and(base, unusedCond)),
  ]);
  const total = totalRow?.n ?? 0;
  return {
    rows: rows.map((image) => ({ image, uses: usage.get(image.id) ?? [] })),
    total,
    totalPages: Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE)),
    allTotal: allRow?.n ?? 0,
    missingTotal: missingRow?.n ?? 0,
    unusedTotal: usedIds.length > 0 ? (unusedRow?.n ?? 0) : (allRow?.n ?? 0),
    usage,
  };
}

/** Staff who have uploaded pictures, for the "uploaded by" filter. */
export async function listUploaders(db: AuditExecutor): Promise<string[]> {
  const rows = await db.selectDistinct({ by: images.createdBy }).from(images);
  return rows.map((r) => r.by).filter((id): id is string => Boolean(id));
}
