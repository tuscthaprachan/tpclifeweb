import { useId, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { ScrollTable } from "./ScrollTable";

export interface DataTableColumn<T> {
  id: string;
  /** Plain text. It doubles as the mobile row label injected via `data-label`, so it cannot be arbitrary markup. */
  header: string;
  cell: (row: T) => ReactNode;
  align?: "start" | "end";
  /** Renders this column as `<th scope="row">` in every body and footer row. Use it on the first column only. */
  rowHeader?: boolean;
  /** Leave this column out below `sm`. Use it for detail that is also on the item's own page. */
  mobileHidden?: boolean;
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

/** A real table at every width, inside `ScrollTable`: it scrolls sideways when wider than the screen, with an edge shadow on each side that has more to scroll to. */
export function DataTable<T>({ columns, rows, getRowKey, caption, className, id, footerRows, sourceNote, footnotes, locale }: DataTableProps<T>) {
  const captionId = `${useId()}-caption`;
  const cell = "px-[var(--space-2)] py-[var(--space-2)] align-top sm:px-[var(--space-3)]";
  const columnClass = (column: DataTableColumn<T>) => cx(column.mobileHidden && "max-sm:hidden", column.align === "end" && cx("text-right whitespace-nowrap", NUMERIC));

  const table = (
    <ScrollTable labelledBy={captionId}>
      <table id={id} className={cx("w-full border-collapse text-left", className)}>
        <caption id={captionId} className="mb-[var(--space-2)] text-left text-sm text-ink-600">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className={cx(cell, "border-b border-line-strong font-semibold text-ink-900", column.align !== "end" && "min-w-[8rem]", columnClass(column))}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) =>
                column.rowHeader ? (
                  <th key={column.id} scope="row" className={cx(cell, "border-t border-line font-semibold text-ink-900", columnClass(column))}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.id} className={cx(cell, "border-t border-line text-ink-900", columnClass(column))}>
                    {column.cell(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
        {footerRows && footerRows.length > 0 ? (
          <tfoot>
            {footerRows.map((footerRow) => (
              <tr key={footerRow.key}>
                {columns.map((column) => {
                  const content = footerRow.cells[column.id];
                  const footerCell = cx(cell, "border-t-2 border-ink-900 font-bold text-ink-900", columnClass(column));
                  return column.rowHeader ? (
                    <th key={column.id} scope="row" className={footerCell}>
                      {content}
                    </th>
                  ) : (
                    <td key={column.id} className={footerCell}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>
    </ScrollTable>
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
