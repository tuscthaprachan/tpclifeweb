import type { ReactNode } from "react";
import { cx } from "./cx";

export interface DataTableColumn<T> {
  id: string;
  /** Plain text. It doubles as the mobile row label injected via `data-label`, so it cannot be arbitrary markup. */
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: ReactNode;
  className?: string;
}

/**
 * A genuine stacked mobile variant, not a horizontal scroll container
 * (1.4.10, and the CONTRIBUTING rule that a wide table gets a real stacked
 * layout unless it is a grid of times). Below `sm` every cell becomes its
 * own flex row with the column header injected as a `::before` from
 * `data-label`, and the `<thead>` is hidden since its content is now
 * repeated per cell.
 *
 * Accessibility note for reviewers: this keeps the table as one real
 * `<table>` and changes `display` at the breakpoint rather than rendering a
 * second, duplicate DOM structure. Overriding `display` on table cells is a
 * documented pattern that can affect how some assistive tech computes table
 * semantics at the collapsed width, and `content: attr(data-label)` is not
 * announced identically by every screen reader. If an audit turns up a
 * concrete failure here, the fallback is to render two structures instead:
 * a `<table>` and a separate `<dl>`-based list, swapped with `hidden`/`sm:hidden`.
 */
export function DataTable<T>({ columns, rows, getRowKey, caption, className }: DataTableProps<T>) {
  return (
    <table className={cx("block w-full border-collapse text-left sm:table", className)}>
      <caption className="mb-[var(--space-2)] text-left text-sm text-ink-600">{caption}</caption>
      <thead className="hidden sm:table-header-group">
        <tr>
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              className={cx(
                "border-b border-line-strong px-[var(--space-3)] py-[var(--space-2)] font-semibold text-ink-900",
                column.align === "end" && "text-right",
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block sm:table-row-group">
        {rows.map((row) => (
          <tr key={getRowKey(row)} className="block border-b border-line py-[var(--space-2)] sm:table-row sm:border-b-0 sm:py-0">
            {columns.map((column) => (
              <td
                key={column.id}
                data-label={column.header}
                className={cx(
                  "flex items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] text-ink-900",
                  "before:font-semibold before:text-ink-600 before:content-[attr(data-label)]",
                  "sm:table-cell sm:border-t sm:border-line sm:px-[var(--space-3)] sm:py-[var(--space-2)] sm:before:content-none",
                  column.align === "end" && "sm:text-right",
                )}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
