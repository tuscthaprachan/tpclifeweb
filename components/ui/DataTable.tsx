import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";

export interface DataTableColumn<T> {
  id: string;
  /** Plain text. It doubles as the mobile row label injected via `data-label`, so it cannot be arbitrary markup. */
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end";
  /** Renders this column as `<th scope="row">` in every body and footer row. Use it on the first column only. */
  rowHeader?: boolean;
}

export interface DataTableFooterRow {
  key: string;
  /** Cell content by column id, for totals. A column with no entry is left empty. */
  cells: Record<string, ReactNode>;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: ReactNode;
  className?: string;
  id?: string;
  /** Totals, drawn in a `<tfoot>`. */
  footerRows?: DataTableFooterRow[];
  /** Where the numbers come from, under the table. */
  sourceNote?: ReactNode;
  /** Numbered notes under the table. Point to them from a cell with `NoteRef`. */
  footnotes?: ReactNode[];
  /** Needed with `footnotes` to say "Notes" in the right language. */
  locale?: Locale;
}

/** The "[note 1]" marker for a cell, linking to the numbered footnote. `tableId` is the `id` given to the DataTable. */
export function NoteRef({ n, tableId, locale }: { n: number; tableId: string; locale: Locale }) {
  return (
    <sup>
      <a href={`#${tableId}-note-${n}`} className="text-action">
        [{UI.odNoteRef[locale]} {formatNumber(n, locale)}]
      </a>
    </sup>
  );
}

const NUMERIC = "tabular-nums";

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
export function DataTable<T>({ columns, rows, getRowKey, caption, className, id, footerRows, sourceNote, footnotes, locale }: DataTableProps<T>) {
  const rowHeaderClass = "px-[var(--space-3)] py-[var(--space-1)] text-left font-semibold text-ink-900 sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)]";

  const table = (
    <table id={id} className={cx("block w-full border-collapse text-left sm:table", className)}>
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
            {columns.map((column) =>
              column.rowHeader ? (
                <th key={column.id} scope="row" className={cx("block", rowHeaderClass)}>
                  {column.cell(row)}
                </th>
              ) : (
                <td
                  key={column.id}
                  data-label={column.header}
                  className={cx(
                    "flex items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] text-ink-900",
                    "before:font-semibold before:text-ink-600 before:content-[attr(data-label)]",
                    "sm:table-cell sm:border-t sm:border-line sm:px-[var(--space-3)] sm:py-[var(--space-2)] sm:before:content-none",
                    column.align === "end" && cx("sm:text-right", NUMERIC),
                  )}
                >
                  <span className="min-w-0 [overflow-wrap:anywhere] sm:contents">{column.cell(row)}</span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
      {footerRows && footerRows.length > 0 ? (
        <tfoot className="block sm:table-footer-group">
          {footerRows.map((footerRow) => (
            <tr key={footerRow.key} className="block border-t-2 border-ink-900 py-[var(--space-2)] sm:table-row sm:py-0">
              {columns.map((column) => {
                const content = footerRow.cells[column.id];
                if (column.rowHeader) {
                  return (
                    <th key={column.id} scope="row" className={cx("block font-bold", rowHeaderClass, "sm:border-t-2 sm:border-ink-900")}>
                      {content}
                    </th>
                  );
                }
                return (
                  <td
                    key={column.id}
                    data-label={column.header}
                    className={cx(
                      content == null ? "hidden sm:table-cell" : "flex",
                      "items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] font-bold text-ink-900",
                      "before:font-semibold before:text-ink-600 before:content-[attr(data-label)]",
                      "sm:table-cell sm:border-t-2 sm:border-ink-900 sm:px-[var(--space-3)] sm:py-[var(--space-2)] sm:before:content-none",
                      column.align === "end" && cx("sm:text-right", NUMERIC),
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tfoot>
      ) : null}
    </table>
  );

  const hasNotes = footnotes && footnotes.length > 0;
  if (!sourceNote && !hasNotes) return table;

  return (
    <div>
      {table}
      {sourceNote ? <p className="m-0 mt-[var(--space-2)] text-sm text-ink-600">{sourceNote}</p> : null}
      {hasNotes ? (
        <ol className="m-0 mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] pl-[var(--space-5)] text-sm text-ink-600" aria-label={locale ? UI.odNotes[locale] : undefined}>
          {footnotes.map((note, index) => (
            <li key={index} id={id ? `${id}-note-${index + 1}` : undefined}>
              {note}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
