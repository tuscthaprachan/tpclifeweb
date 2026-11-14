/**
 * The query string of the case inbox: parsing `?service=&status=&assignee=&q=&open=&overdue=&escalated=&sort=&dir=&page=`
 * and building links that keep the other filters. Pure, so the page, the
 * saved views, the bulk form and the CSV export all read the same parameters.
 */

export const CASE_SORT_KEYS = ["received", "updated", "due", "reference", "status"] as const;
export type CaseSortKey = (typeof CASE_SORT_KEYS)[number];
export type CaseSortDir = "asc" | "desc";

export const DEFAULT_CASE_SORT: { sort: CaseSortKey; dir: CaseSortDir } = { sort: "updated", dir: "desc" };

export const defaultCaseDir = (sort: CaseSortKey): CaseSortDir => (sort === "reference" || sort === "status" || sort === "due" ? "asc" : "desc");

export interface InboxQuery {
  service?: string;
  status?: string;
  assignee?: "me" | "unassigned";
  q?: string;
  open?: boolean;
  overdue?: boolean;
  escalated?: boolean;
  sort: CaseSortKey;
  dir: CaseSortDir;
  page: number;
}

export type RawInboxParams = Partial<Record<"service" | "status" | "assignee" | "q" | "open" | "overdue" | "escalated" | "sort" | "dir" | "page", string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The parameters a saved view may hold: the filters and the sort, never the page. */
export const VIEW_KEYS = ["service", "status", "assignee", "q", "open", "overdue", "escalated", "sort", "dir"] as const;

/**
 * Reads and sanitises the parameters. `services` and `statuses` are what this
 * person may use; a value outside them is dropped.
 */
export function parseInboxQuery(raw: RawInboxParams, allowed: { services: readonly string[]; statuses: readonly string[] }): InboxQuery {
  const sortRaw = one(raw.sort) as CaseSortKey | undefined;
  const sort = sortRaw && CASE_SORT_KEYS.includes(sortRaw) ? sortRaw : DEFAULT_CASE_SORT.sort;
  const dirRaw = one(raw.dir);
  const dir: CaseSortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : sortRaw === sort ? defaultCaseDir(sort) : DEFAULT_CASE_SORT.dir;
  const assignee = one(raw.assignee);
  const service = one(raw.service);
  const status = one(raw.status);
  return {
    service: service && allowed.services.includes(service) ? service : undefined,
    status: status && allowed.statuses.includes(status) ? status : undefined,
    assignee: assignee === "me" || assignee === "unassigned" ? assignee : undefined,
    q: one(raw.q)?.trim().slice(0, 100) || undefined,
    open: one(raw.open) === "1",
    overdue: one(raw.overdue) === "1",
    escalated: one(raw.escalated) === "1",
    sort,
    dir,
    page: Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1),
  };
}

/** The parameters as a query string (no leading `?`), leaving out defaults and empty values. */
export function inboxParams(query: Partial<InboxQuery>): string {
  const sp = new URLSearchParams();
  if (query.service) sp.set("service", query.service);
  if (query.status) sp.set("status", query.status);
  if (query.assignee) sp.set("assignee", query.assignee);
  if (query.q) sp.set("q", query.q);
  if (query.open) sp.set("open", "1");
  if (query.overdue) sp.set("overdue", "1");
  if (query.escalated) sp.set("escalated", "1");
  const sort = query.sort ?? DEFAULT_CASE_SORT.sort;
  const dir = query.dir ?? defaultCaseDir(sort);
  if (sort !== DEFAULT_CASE_SORT.sort || dir !== DEFAULT_CASE_SORT.dir) {
    sp.set("sort", sort);
    sp.set("dir", dir);
  }
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  return sp.toString();
}

export function inboxHref(query: InboxQuery, overrides: Partial<InboxQuery> = {}): string {
  const qs = inboxParams({ ...query, ...overrides });
  return qs ? `/admin/cases?${qs}` : "/admin/cases";
}

/** Clicking a column: the same column flips direction, another starts at its natural direction. */
export function nextCaseSort(query: Pick<InboxQuery, "sort" | "dir">, key: CaseSortKey): Partial<InboxQuery> {
  return { sort: key, dir: query.sort === key ? (query.dir === "asc" ? "desc" : "asc") : defaultCaseDir(key), page: 1 };
}

/** A saved view's query string reduced to the filter and sort keys, in a fixed order, so equal views compare equal. */
export function canonicalViewQuery(raw: string): string {
  const sp = new URLSearchParams(raw.replace(/^\?/, ""));
  const out = new URLSearchParams();
  for (const key of VIEW_KEYS) {
    const value = sp.get(key);
    if (value && value.length <= 100) out.set(key, value);
  }
  return out.toString();
}
