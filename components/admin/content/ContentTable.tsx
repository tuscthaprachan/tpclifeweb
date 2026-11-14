import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { SortDir, SortKey } from "@/lib/admin/content/list-query";

/**
 * Where a column goes in the compact phone card, which is used when any column names a slot.
 * Case layout: select, head and tag share line 1, text is line 2, start and end share line 3.
 * List layout: select and wide share line 1, sub and action line 2, note line 3.
 */
export type MobileSlot = "select" | "head" | "wide" | "tag" | "text" | "start" | "end" | "sub" | "action" | "note" | "hidden";

export interface ContentTableColumn<T, K extends string = SortKey> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the header a sort link; `href` is where a click leads. */
  sort?: { key: K; href: string };
  rowHeader?: boolean;
  align?: "start" | "end";
  /** The column only holds a control, so its header is read out but not shown. */
  headerHidden?: boolean;
  /** Placement in the compact phone card. Leave out on every column to keep the labelled stack. */
  mobile?: MobileSlot;
}

const SLOT: Record<MobileSlot, string> = {
  select: "max-sm:col-start-1 max-sm:row-start-1",
  head: "max-sm:col-start-2 max-sm:row-start-1",
  tag: "max-sm:col-start-3 max-sm:row-start-1 max-sm:justify-self-end",
  text: "max-sm:col-span-3 max-sm:row-start-2",
  start: "max-sm:col-[1/3] max-sm:row-start-3",
  end: "max-sm:col-start-3 max-sm:row-start-3 max-sm:justify-self-end max-sm:max-w-[10rem]",
  wide: "max-sm:col-[2/4] max-sm:row-start-1",
  sub: "max-sm:col-[1/3] max-sm:row-start-2",
  action: "max-sm:col-start-3 max-sm:row-start-2 max-sm:justify-self-end",
  note: "max-sm:col-span-3 max-sm:row-start-3 max-sm:text-sm max-sm:text-ink-600",
  hidden: "max-sm:hidden",
};

const COMPACT_CELL = "min-w-0 px-[var(--space-1)] py-[var(--space-1)] text-ink-900 sm:table-cell sm:border-t sm:border-line sm:px-[var(--space-3)] sm:py-[var(--space-2)]";

const CELL =
  "flex items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] text-ink-900 " +
  "before:max-w-[45%] before:shrink-0 before:font-semibold before:text-ink-600 before:content-[attr(data-label)] " +
  "sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)] sm:before:content-none";

/**
 * The list table: the stacked mobile layout of `DataTable`, with sortable
 * column headers (`aria-sort`, a link that toggles the direction) and a
 * leading control column. The header row is hidden below `sm`, so the list
 * page repeats the sort links above the table at that width.
 */
export function ContentTable<T, K extends string = SortKey>({
  columns,
  rows,
  getRowKey,
  caption,
  sort,
  locale,
}: {
  columns: ContentTableColumn<T, K>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  sort: { key: K; dir: SortDir };
  locale: Locale;
}) {
  const compact = columns.some((c) => c.mobile);
  return (
    <table className="block w-full border-collapse text-left sm:table">
      <caption className="mb-[var(--space-2)] text-left text-sm text-ink-600">{caption}</caption>
      <thead className="hidden sm:table-header-group">
        <tr>
          {columns.map((column) => {
            const active = column.sort?.key === sort.key;
            const ariaSort = column.sort ? (active ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined;
            return (
              <th
                key={column.id}
                scope="col"
                aria-sort={ariaSort}
                className={`border-b border-line-strong px-[var(--space-3)] py-[var(--space-2)] font-semibold text-ink-900 ${column.align === "end" ? "text-right" : ""}`}
              >
                {column.headerHidden ? (
                  <span className="visually-hidden">{column.header}</span>
                ) : column.sort ? (
                  <Link href={column.sort.href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] text-ink-900">
                    <span>{column.header}</span>
                    <ConsoleIcon name={active ? (sort.dir === "asc" ? "moveUp" : "moveDown") : "sortNone"} size={14} />
                    <span className="visually-hidden">
                      {active ? ` (${a(sort.dir === "asc" ? "clSortedAsc" : "clSortedDesc", locale)})` : ` (${a("clSortBy", locale, { column: column.header })})`}
                    </span>
                  </Link>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="block sm:table-row-group">
        {rows.map((row) => (
          <tr
            key={getRowKey(row)}
            className={`block border-b border-line py-[var(--space-2)] sm:table-row sm:border-b-0 sm:py-0 ${compact ? "max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-[var(--space-2)] max-sm:px-[var(--space-2)]" : ""}`}
          >
            {columns.map((column) =>
              compact && column.rowHeader ? (
                <th key={column.id} scope="row" className={`${COMPACT_CELL} ${SLOT[column.mobile ?? "hidden"]} text-left font-semibold`}>
                  {column.cell(row)}
                </th>
              ) : compact ? (
                <td key={column.id} className={`${COMPACT_CELL} ${SLOT[column.mobile ?? "hidden"]} ${column.align === "end" ? "sm:text-right" : ""}`}>
                  {column.cell(row)}
                </td>
              ) : column.rowHeader ? (
                <th key={column.id} scope="row" className="block px-[var(--space-3)] py-[var(--space-1)] text-left font-semibold text-ink-900 sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)]">
                  {column.cell(row)}
                </th>
              ) : (
                <td key={column.id} data-label={column.headerHidden ? undefined : column.header} className={`${CELL} ${column.align === "end" ? "sm:text-right" : ""}`}>
                  <span className="min-w-0 [overflow-wrap:anywhere] sm:contents">{column.cell(row)}</span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
