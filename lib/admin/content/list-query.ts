/**
 * The query-string side of a content list: parsing `?sort=&dir=&by=&within=&facet=`
 * and building links that keep the other filters. Pure, so the list page, the
 * bulk actions and the CSV export all read the same parameters.
 */

export const SORT_KEYS = ["title", "updated", "status", "date"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";
export type ListStatus = "published" | "draft";
export type ListWithin = "7d" | "30d";

export const DEFAULT_SORT: { sort: SortKey; dir: SortDir } = { sort: "updated", dir: "desc" };

export interface ListQuery {
  q?: string;
  status?: ListStatus;
  sort: SortKey;
  dir: SortDir;
  /** A staff member's user id. */
  by?: string;
  within?: ListWithin;
  /** The value of the type's one facet (event category, policy status). */
  facet?: string;
  page: number;
}

export type RawListParams = Partial<Record<"q" | "status" | "sort" | "dir" | "by" | "within" | "facet" | "page", string | string[] | undefined>>;

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/** Reads `?status=`; anything else is "all" (undefined). */
export function parseListStatus(value: string | undefined): ListStatus | undefined {
  return value === "published" || value === "draft" ? value : undefined;
}

export function parseWithin(value: string | undefined): ListWithin | undefined {
  return value === "7d" || value === "30d" ? value : undefined;
}

export const defaultDir = (sort: SortKey): SortDir => (sort === "title" || sort === "status" ? "asc" : "desc");

/**
 * Reads and sanitises the list parameters. A sort key the type does not offer
 * falls back to the default; a facet value is checked against `facetValues`.
 */
export function parseListQuery(
  raw: RawListParams,
  options: { sortable?: readonly SortKey[]; hasStatus?: boolean; facetValues?: readonly string[] } = {},
): ListQuery {
  const sortable = options.sortable ?? SORT_KEYS;
  const sortRaw = one(raw.sort) as SortKey | undefined;
  const sort = sortRaw && sortable.includes(sortRaw) ? sortRaw : DEFAULT_SORT.sort;
  const dirRaw = one(raw.dir);
  const dir: SortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : sortRaw === sort ? defaultDir(sort) : DEFAULT_SORT.dir;
  const facet = one(raw.facet);
  const by = one(raw.by)?.trim();
  return {
    q: one(raw.q)?.trim() || undefined,
    status: options.hasStatus === false ? undefined : parseListStatus(one(raw.status)),
    sort,
    dir,
    by: by || undefined,
    within: parseWithin(one(raw.within)),
    facet: facet && options.facetValues?.includes(facet) ? facet : undefined,
    page: Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1),
  };
}

/** The parameters as a query string (no leading `?`), leaving out defaults and empty values. */
export function listParams(query: Partial<ListQuery>): string {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.by) search.set("by", query.by);
  if (query.within) search.set("within", query.within);
  if (query.facet) search.set("facet", query.facet);
  const sort = query.sort ?? DEFAULT_SORT.sort;
  const dir = query.dir ?? defaultDir(sort);
  if (sort !== DEFAULT_SORT.sort || dir !== DEFAULT_SORT.dir) {
    search.set("sort", sort);
    search.set("dir", dir);
  }
  if (query.page && query.page > 1) search.set("page", String(query.page));
  return search.toString();
}

/** `base` with the query applied; `overrides` change one thing and reset the page unless it is given. */
export function listHref(base: string, query: ListQuery, overrides: Partial<ListQuery> = {}): string {
  const next = { ...query, page: 1, ...overrides };
  const text = listParams(next);
  return text ? `${base}?${text}` : base;
}

/** The sort a header click leads to: the opposite direction on the current column, that column's natural direction otherwise. */
export function nextSort(query: Pick<ListQuery, "sort" | "dir">, key: SortKey): { sort: SortKey; dir: SortDir } {
  if (query.sort === key) return { sort: key, dir: query.dir === "asc" ? "desc" : "asc" };
  return { sort: key, dir: defaultDir(key) };
}

export type ActiveFilter = "q" | "status" | "by" | "within" | "facet";

/** Which filters are set, in display order. */
export function activeFilters(query: ListQuery): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  if (query.q) out.push("q");
  if (query.status) out.push("status");
  if (query.by) out.push("by");
  if (query.within) out.push("within");
  if (query.facet) out.push("facet");
  return out;
}

/** The query with one filter removed. */
export function withoutFilter(query: ListQuery, filter: ActiveFilter): ListQuery {
  return { ...query, [filter]: undefined, page: 1 };
}

/** Keeps only the known list parameters from a raw query string, for a safe redirect back to the list. */
export function sanitiseBack(value: string | null | undefined): string {
  const search = new URLSearchParams((value ?? "").replace(/^\?/, ""));
  const keep = new URLSearchParams();
  for (const key of ["q", "status", "sort", "dir", "by", "within", "facet", "page"]) {
    const v = search.get(key);
    if (v) keep.set(key, v.slice(0, 200));
  }
  return keep.toString();
}
