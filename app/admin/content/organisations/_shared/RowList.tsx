"use client";

import type { ReactNode } from "react";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import { AddRowButton, RepeaterStatus, RowActions } from "@/components/admin/content/RowButtons";
import { useRepeater } from "@/components/admin/hooks/use-repeater";

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

/**
 * A repeatable group of rows on a content form: add, remove, move up and
 * down. Rows keep a stable key, so typed values travel with their row when
 * it moves. Client side only; the action reads the posted rows back with
 * `rowsOf` (see rows.ts).
 */
export function RowList<R>({ name, legend, hint, itemLabel, initial, blank, renderRow, max = 100, orderable = true, compact = false }: RowListProps<R>) {
  const { errors, locale, markDirty } = useContentForm();
  const list = useRepeater<R>(initial, { locale, itemLabel, max, onChange: markDirty });
  const error = errors[name];
  const item = (index: number) => a("dirRowTitle", locale, { item: itemLabel, n: index + 1 });

  return (
    <fieldset id={fieldId(name)} tabIndex={-1} className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{legend}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      {error ? <p className="m-0 mb-[var(--space-2)] text-base font-medium text-error">{error}</p> : null}
      {list.rows.length === 0 ? <p className="m-0 mb-[var(--space-2)] text-ink-600">{a("dirRowsEmpty", locale)}</p> : null}
      <RepeaterStatus message={list.message} />
      <ol className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {list.rows.map((row, index) => (
          <li key={row.key} ref={list.rowRef(row.key)}>
            <fieldset className={compact ? "m-0 flex flex-wrap items-end gap-[var(--space-3)] border-0 p-0" : "m-0 flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]"}>
              <legend className={compact ? "visually-hidden" : "px-[var(--space-1)] font-semibold text-ink-900"}>{item(index)}</legend>
              {renderRow(row.value, { index })}
              <RowActions
                locale={locale}
                label={item(index)}
                first={index === 0}
                last={index === list.rows.length - 1}
                onMove={orderable ? (by) => list.move(row.key, by) : undefined}
                onRemove={() => list.remove(row.key)}
              />
            </fieldset>
          </li>
        ))}
      </ol>
      {list.canAdd ? <AddRowButton addRef={list.addRef} label={a("listAddItem", locale, { item: itemLabel.toLowerCase() })} onClick={() => list.add(blank())} /> : null}
    </fieldset>
  );
}
