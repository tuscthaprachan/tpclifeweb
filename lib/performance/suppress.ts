/**
 * Small-number suppression. A figure based on fewer than five cases could
 * point at one person (the only complaint about a stall in March, the single
 * student who answered the survey), so it is never published: the page says
 * "Not enough data" instead, and carries no number at all, not even the
 * count. Every figure in lib/performance goes through `measure`.
 *
 * Totals shown beside a breakdown could give a hidden row away by
 * subtraction, so `groupCategoryCounts` merges small and sensitive rows until
 * every row it returns is safe.
 */

export const MIN_CASES = 5;

/** A published figure: either hidden, or its value and the number of cases it rests on. */
export type Measure<T = number> = { suppressed: true } | { suppressed: false; n: number; value: T };

export const HIDDEN = { suppressed: true } as const;

/** `n` is how many cases the figure is based on. Hidden below `MIN_CASES`, or when there is no value to show. */
export function measure<T>(n: number, value: T | null | undefined): Measure<T> {
  if (n < MIN_CASES || value === null || value === undefined) return { suppressed: true };
  return { suppressed: false, n, value };
}

/** A count is its own base. */
export function countMeasure(n: number): Measure<number> {
  return measure(n, n);
}

/** `ok` of `base`, as a whole percentage. */
export function shareMeasure(ok: number, base: number): Measure<number> {
  return measure(base, base > 0 ? Math.round((ok / base) * 100) : null);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface CategoryCount {
  key: string;
  nameTh: string;
  nameEn: string;
  restricted: boolean;
  n: number;
}

export type PoolKind = "sensitive" | "other" | "sensitive_other";

export type GroupedRow =
  | { type: "category"; key: string; nameTh: string; nameEn: string; n: number }
  | { type: "pool"; pool: PoolKind; n: number };

/**
 * Complaints received by category, safe to publish. A named row appears only
 * for an ordinary category with five or more complaints. Every restricted
 * category is folded into one "Sensitive" row, never shown by name, and
 * ordinary categories below five go into "Other". If either of those pools is
 * itself below five they are merged, and if the merged pool is still below
 * five the smallest named category is folded in until it is not. With a total
 * shown elsewhere, no row can then be found by subtraction. A total below five
 * returns no rows.
 */
export function groupCategoryCounts(rows: readonly CategoryCount[]): GroupedRow[] {
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  if (total < MIN_CASES) return [];

  const named = rows.filter((r) => !r.restricted && r.n >= MIN_CASES).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  const sensitive = rows.filter((r) => r.restricted).reduce((sum, r) => sum + r.n, 0);
  const other = rows.filter((r) => !r.restricted && r.n < MIN_CASES).reduce((sum, r) => sum + r.n, 0);
  const small = (n: number) => n > 0 && n < MIN_CASES;

  if (!small(sensitive) && !small(other)) {
    const pools: GroupedRow[] = [];
    if (sensitive > 0) pools.push({ type: "pool", pool: "sensitive", n: sensitive });
    if (other > 0) pools.push({ type: "pool", pool: "other", n: other });
    return [...named.map(asCategory), ...pools];
  }

  let pool = sensitive + other;
  let kind: PoolKind = sensitive > 0 && other > 0 ? "sensitive_other" : sensitive > 0 ? "sensitive" : "other";
  const kept = [...named];
  while (pool < MIN_CASES && kept.length > 0) {
    const smallest = kept.pop()!;
    pool += smallest.n;
    kind = sensitive > 0 ? "sensitive_other" : "other";
  }
  return [...kept.map(asCategory), { type: "pool", pool: kind, n: pool }];
}

function asCategory(r: CategoryCount): GroupedRow {
  return { type: "category", key: r.key, nameTh: r.nameTh, nameEn: r.nameEn, n: r.n };
}
