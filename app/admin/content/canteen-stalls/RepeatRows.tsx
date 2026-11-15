"use client";

import { Fieldset, Select, TextInput } from "@/components/ui";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import { AddRowButton, RepeaterStatus, RowActions } from "@/components/admin/content/RowButtons";
import { useRepeater } from "@/components/admin/hooks/use-repeater";

export interface RowFieldOption {
  value: string;
  label: string;
}

export interface RowField {
  /** Dotted key within the row: "label.th" posts as `<name>.<n>.label.th`. */
  key: string;
  label: string;
  kind: "text" | "number" | "time" | "select" | "checks";
  options?: RowFieldOption[];
  lang?: "th" | "en";
  hint?: string;
  /** A tall, scrolling tick list, for choices that can run to dozens. */
  scroll?: boolean;
}

/** A row's stored values by dotted key. Tick lists hold an array. */
export type RowValue = Record<string, string | string[]>;

interface RepeatRowsProps {
  name: string;
  legend: string;
  /** Singular, for "Variant 2", "Remove variant 2". */
  itemLabel: string;
  hint?: string;
  fields: RowField[];
  defaultRows?: RowValue[];
  max?: number;
}

/**
 * A growing list of structured rows (variants, opening hours, floor plan
 * points). Posts `<name>.0.<key>`, `<name>.1.<key>`... in the order shown;
 * the action drops rows left entirely blank. Rows can be added, removed and
 * moved up or down.
 */
export function RepeatRows({ name, legend, itemLabel, hint, fields, defaultRows = [], max = 50 }: RepeatRowsProps) {
  const { errors, locale, markDirty } = useContentForm();
  const list = useRepeater<RowValue>(defaultRows, { locale, itemLabel, max, onChange: markDirty });

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{legend}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      <RepeaterStatus message={list.message} />
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {list.rows.map((row, index) => {
          const n = index + 1;
          const hidden = (
            <span className="visually-hidden">
              {" "}
              {itemLabel} {n}
            </span>
          );
          return (
            <li key={row.key} ref={list.rowRef(row.key)} className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]">
              <p className="m-0 font-medium">
                {itemLabel} {n}
              </p>
              <div className="grid gap-[var(--space-3)] md:grid-cols-2">
                {fields.map((field) => {
                  const path = `${name}.${index}.${field.key}`;
                  const id = fieldId(path);
                  const stored = row.value[field.key];
                  const label = (
                    <>
                      {field.label}
                      {hidden}
                    </>
                  );
                  if (field.kind === "select") {
                    return (
                      <Select
                        key={field.key}
                        id={id}
                        name={path}
                        label={label}
                        hint={field.hint}
                        error={errors[path]}
                        options={field.options ?? []}
                        defaultValue={typeof stored === "string" ? stored : ""}
                      />
                    );
                  }
                  if (field.kind === "checks") {
                    const chosen = Array.isArray(stored) ? stored : stored ? [stored] : [];
                    return (
                      <Fieldset key={field.key} legend={label} hint={field.hint} error={errors[path]} id={id} className="md:col-span-2">
                        <div className={`flex flex-wrap gap-x-[var(--space-4)] ${field.scroll ? "max-h-[14rem] flex-col flex-nowrap overflow-y-auto" : ""}`}>
                          {(field.options ?? []).map((option, optionIndex) => (
                            <label key={option.value} className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                              <input
                                id={optionIndex === 0 ? id : undefined}
                                type="checkbox"
                                name={path}
                                value={option.value}
                                defaultChecked={chosen.includes(option.value)}
                                className="size-5 shrink-0"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </Fieldset>
                    );
                  }
                  return (
                    <TextInput
                      key={field.key}
                      id={id}
                      name={path}
                      type={field.kind === "time" ? "time" : "text"}
                      inputMode={field.kind === "number" ? "numeric" : undefined}
                      lang={field.lang}
                      label={label}
                      hint={field.hint}
                      error={errors[path]}
                      defaultValue={typeof stored === "string" ? stored : ""}
                      autoComplete="off"
                    />
                  );
                })}
              </div>
              <RowActions
                locale={locale}
                label={`${itemLabel} ${n}`}
                first={index === 0}
                last={index === list.rows.length - 1}
                onMove={(by) => list.move(row.key, by)}
                onRemove={() => list.remove(row.key)}
              />
            </li>
          );
        })}
      </ul>
      {list.canAdd ? <AddRowButton addRef={list.addRef} label={a("listAddItem", locale, { item: itemLabel.toLowerCase() })} onClick={() => list.add({})} /> : null}
    </fieldset>
  );
}
