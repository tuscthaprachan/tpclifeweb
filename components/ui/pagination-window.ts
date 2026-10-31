export type PaginationItem = number | "gap";

/**
 * The page numbers to show: first, last, the current page and one either side, with a gap marker
 * where pages are skipped. A gap that would hide a single page shows that page instead.
 */
export function paginationWindow(currentPage: number, totalPages: number): PaginationItem[] {
  const total = Math.max(0, Math.floor(totalPages));
  if (total === 0) return [];
  const current = Math.min(Math.max(1, Math.floor(currentPage)), total);
  const wanted = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) items.push("gap");
    items.push(page);
  });
  return items;
}
