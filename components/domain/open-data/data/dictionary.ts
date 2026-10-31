import type { BudgetLineRow } from "@/lib/open-data/read";
import { categoryParts } from "../budget/labels";

const ALL_ORGANISATIONS = "รวมทุกองค์กร";

/** Page numbers as a list of ranges: [5, 6, 8, 9, 10, 16] gives "5, 6, 8 to 10, 16". */
export function pageRanges(pages: readonly number[], to: string): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start: number | undefined;
  let previous: number | undefined;
  const close = () => {
    if (start === undefined || previous === undefined) return;
    parts.push(start === previous ? String(start) : previous === start + 1 ? `${start}, ${previous}` : `${start} ${to} ${previous}`);
  };
  for (const page of sorted) {
    if (previous !== undefined && page === previous + 1) {
      previous = page;
      continue;
    }
    close();
    start = page;
    previous = page;
  }
  close();
  return parts.join(", ");
}

export interface ViewCount {
  view: "organisation" | "project" | "category" | "category-all";
  year: number | null;
  rows: number;
}

/** How many rows each kind of line has, by view and, for the organisation view, by fiscal year. */
export function viewCounts(lines: readonly BudgetLineRow[]): ViewCount[] {
  const counts: ViewCount[] = [];
  const years = [...new Set(lines.filter((l) => l.view === "organisation").map((l) => l.fiscalYear))].sort((a, b) => b - a);
  for (const year of years) {
    counts.push({ view: "organisation", year, rows: lines.filter((l) => l.view === "organisation" && l.fiscalYear === year).length });
  }
  counts.push({ view: "project", year: null, rows: lines.filter((l) => l.view === "project").length });
  counts.push({ view: "category", year: null, rows: lines.filter((l) => l.view === "category" && l.organisationType !== ALL_ORGANISATIONS).length });
  counts.push({ view: "category-all", year: null, rows: lines.filter((l) => l.view === "category" && l.organisationType === ALL_ORGANISATIONS).length });
  return counts.filter((c) => c.rows > 0);
}

/** Rows per organisation type, most first. */
export function typeCounts(lines: readonly BudgetLineRow[]): { type: string; rows: number }[] {
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line.organisationType, (counts.get(line.organisationType) ?? 0) + 1);
  return [...counts.entries()].map(([type, rows]) => ({ type, rows })).sort((a, b) => b.rows - a.rows || a.type.localeCompare(b.type, "th"));
}

export function categoryGroups(lines: readonly BudgetLineRow[]): string[] {
  return [...new Set(lines.filter((l) => l.view === "category").map((l) => categoryParts(l.category).group).filter(Boolean))];
}

export function amountRange(lines: readonly BudgetLineRow[]): { min: string; max: string } | null {
  if (lines.length === 0) return null;
  const sorted = [...lines].sort((a, b) => Number(a.amount) - Number(b.amount));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first && last ? { min: first.amount, max: last.amount } : null;
}

export function rowsByYear(lines: readonly BudgetLineRow[]): { year: number; rows: number }[] {
  const counts = new Map<number, number>();
  for (const line of lines) counts.set(line.fiscalYear, (counts.get(line.fiscalYear) ?? 0) + 1);
  return [...counts.entries()].map(([year, rows]) => ({ year, rows })).sort((a, b) => b.year - a.year);
}
