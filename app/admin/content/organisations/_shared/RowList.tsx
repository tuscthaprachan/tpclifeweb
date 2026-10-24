"use client";

import { useRef, useState, type ReactNode } from "react";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";

export interface RowContext {
  /** Position in the list right now; use it to build field names (`${name}.${index}.field`). */
  index: number;
}

interface RowListProps<R> {
  /** Form name; rows post as `<name>.0.<field>`, `<name>.1.<field>`... */
  name: string;
  legend: string;
  hint?: ReactNode;
  /** Singular, e.g. "Stop": titles each row "Stop 2" and labels the buttons. */
  itemLabel: string;
  initial: R[];
  /** A new row's starting values: the sensible defaults. */
  blank: () => R;
  /** The controls of one row. Uncontrolled, with `defaultValue` from `row`. */
  renderRow: (row: R, context: RowContext) => ReactNode;
  max?: number;
  /** Show move up and down. Default true. */
  orderable?: boolean;
  /** One line per row without a titled box, for lists of single values (times, dates). */
  compact?: boolean;
}

const BUTTON = "inline-flex min-h-[var(--target-min)] items-center text-action underline disabled:text-ink-600 disabled:no-underline";

/**
 * A repeatable group of rows on a content form: add, remove, move up and
 * down. Rows keep a stable key, so typed values travel with their row when
 * it moves. Client side only; the action reads the posted rows back with
 * `rowsOf` (see rows.ts).
 */
export function RowList<R>({ name, legend, hint, itemLabel, initial, blank, renderRow, max = 100, orderable = true, compact = false }: RowListProps<R>) {
  const { errors, locale, markDirty } = useContentForm();
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState(() => initial.map((value, i) => ({ key: i, value })));
  const error = errors[name];
  const item = (index: number) => a("dirRowTitle", locale, { item: itemLabel, n: index + 1 });

  function move(index: number, by: -1 | 1) {
    setRows((cur) => {
      const next = [...cur];
      const target = index + by;
      if (target < 0 || target >= next.length) return cur;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    markDirty();
  }

  return (
    <fieldset id={fieldId(name)} tabIndex={-1} className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{legend}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      {error ? <p className="m-0 mb-[var(--space-2)] text-base font-medium text-error">{error}</p> : null}
      {rows.length === 0 ? <p className="m-0 mb-[var(--space-2)] text-ink-600">{a("dirRowsEmpty", locale)}</p> : null}
      <ol className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {rows.map((row, index) => (
          <li key={row.key}>
            <fieldset className={compact ? "m-0 flex flex-wrap items-end gap-[var(--space-3)] border-0 p-0" : "m-0 flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]"}>
              <legend className={compact ? "visually-hidden" : "px-[var(--space-1)] font-semibold text-ink-900"}>{item(index)}</legend>
              {renderRow(row.value, { index })}
              <div className="flex flex-wrap gap-x-[var(--space-4)]">
                {orderable ? (
                  <>
                    <button type="button" className={BUTTON} disabled={index === 0} onClick={() => move(index, -1)}>
                      {a("moveUp", locale)}
                      <span className="visually-hidden"> {item(index)}</span>
                    </button>
                    <button type="button" className={BUTTON} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                      {a("moveDown", locale)}
                      <span className="visually-hidden"> {item(index)}</span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => {
                    setRows((cur) => cur.filter((r) => r.key !== row.key));
                    markDirty();
                  }}
                >
                  {a("remove", locale)}
                  <span className="visually-hidden"> {item(index)}</span>
                </button>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {rows.length < max ? (
        <button
          type="button"
          onClick={() => {
            const key = nextKey.current++;
            setRows((cur) => [...cur, { key, value: blank() }]);
            markDirty();
          }}
          className="mt-[var(--space-3)] inline-flex min-h-[var(--target-min)] items-center rounded-control border border-line-strong bg-surface px-[var(--space-4)] py-[var(--space-2)] font-medium"
        >
          {a("listAddItem", locale, { item: itemLabel.toLowerCase() })}
        </button>
      ) : null}
    </fieldset>
  );
}
