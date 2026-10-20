/**
 * Pagination over groups. A page holds up to `size` dishes; groups are cut
 * across the page boundary rather than moved, so the order never changes
 * and every page is full. A group that continues on the next page repeats
 * its heading there, and `continued` says so.
 */

import type { DishGroup } from "@/lib/canteen/filter";

export interface PagedGroup extends DishGroup {
  /** True when this group started on an earlier page. */
  continued: boolean;
  /** How many dishes the whole group has, across pages. */
  groupSize: number;
}

export interface Paged {
  groups: PagedGroup[];
  page: number;
  totalPages: number;
  total: number;
  /** 1 based, inclusive. 0 and 0 when there are no dishes. */
  from: number;
  to: number;
}

/** The dishes per page on the dish list. */
export const DISH_PAGE_SIZE = 48;

/** Slices `groups` to page `page` (1 based, clamped into range) of `size` dishes. */
export function paginateGroups(groups: readonly DishGroup[], page: number, size = DISH_PAGE_SIZE): Paged {
  const total = groups.reduce((sum, group) => sum + group.dishes.length, 0);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (current - 1) * size;
  const end = Math.min(total, start + size);

  const out: PagedGroup[] = [];
  let offset = 0;
  for (const group of groups) {
    const groupStart = offset;
    const groupEnd = offset + group.dishes.length;
    offset = groupEnd;
    if (groupEnd <= start || groupStart >= end) continue;
    const from = Math.max(start, groupStart) - groupStart;
    const to = Math.min(end, groupEnd) - groupStart;
    out.push({ ...group, dishes: group.dishes.slice(from, to), continued: from > 0, groupSize: group.dishes.length });
  }

  return { groups: out, page: current, totalPages, total, from: total === 0 ? 0 : start + 1, to: end };
}

/** Reads `?page=` as a positive whole number, or 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = value !== undefined ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
