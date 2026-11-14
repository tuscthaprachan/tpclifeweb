import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { SortDir, SortKey } from "@/lib/admin/content/list-query";

export interface ContentTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the header a sort link; `href` is where a click leads. */
  sort?: { key: SortKey; href: string };
  rowHeader?: boolean;
  align?: "start" | "end";
  /** The column only holds a control, so its header is read out but not shown. */
  headerHidden?: boolean;
}

const CELL =
  "flex items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] text-ink-900 " +
  "before:font-semibold before:text-ink-600 before:content-[attr(data-label)] " +
  "sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)] sm:before:content-none";

/**
 * The list table: the stacked mobile layout of `DataTable`, with sortable
 * column headers (`aria-sort`, a link that toggles the direction) and a
 * leading control column. The header row is hidden below `sm`, so the list
 * page repeats the sort links above the table at that width.
 */
export function ContentTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  sort,
  locale,
}: {
  columns: ContentTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  sort: { key: SortKey; dir: SortDir };
  locale: Locale;
}) {
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
          <tr key={getRowKey(row)} className="block border-b border-line py-[var(--space-2)] sm:table-row sm:border-b-0 sm:py-0">
            {columns.map((column) =>
              column.rowHeader ? (
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
