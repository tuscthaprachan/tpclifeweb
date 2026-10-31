export const INCOME_ONLY = "ดอกผลกองทุนห้ามจ่ายขาดสำหรับเงินต้น";
export const SPENDABLE = "กองทุนจ่ายขาด";

export type FundKind = "income" | "spendable" | "other";
export type FundFilter = "" | "income" | "spendable";

/** The type as the list prints it, reduced to the two it uses. */
export function fundKind(type: string): FundKind {
  if (type === INCOME_ONLY) return "income";
  if (type === SPENDABLE) return "spendable";
  return "other";
}

export function parseFundFilter(raw: string | undefined): FundFilter {
  return raw === "income" || raw === "spendable" ? raw : "";
}

export const FUNDS_PAGE_SIZE = 25;

export interface FundListRow {
  number: number;
  kind: FundKind;
  /** The type as the list prints it, kept only for a type the list does not use elsewhere. */
  type?: string;
  code: string;
  name: string;
}

export interface FundsView {
  filter: FundFilter;
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  rows: FundListRow[];
}

export function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** The funds for a type filter and page number, the page clamped to the pages that exist. */
export function fundsView(funds: readonly FundListRow[], filter: FundFilter, requestedPage: number, pageSize: number = FUNDS_PAGE_SIZE): FundsView {
  const matching = filter === "" ? [...funds] : funds.filter((f) => f.kind === filter);
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  const rows = matching.slice(start, start + pageSize);
  return {
    filter,
    page,
    totalPages,
    from: matching.length === 0 ? 0 : start + 1,
    to: start + rows.length,
    total: matching.length,
    rows,
  };
}

/** The address of a page of the list: no query at all for the first page of the unfiltered list. */
export function fundsHref(base: string, filter: FundFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter) params.set("type", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
