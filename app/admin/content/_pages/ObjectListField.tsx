"use client";

import { useRef, useState, type ReactNode } from "react";
import { Select, Textarea, TextInput } from "@/components/ui";
import { CheckboxField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";

/** One input inside a row. Plain data, so a server component can pass it down. */
export type RowFieldSpec =
  | { key: string; type: "text" | "url"; label: string; hint?: string; maxLength?: number }
  | { key: string; type: "bilingual"; label: string; hint?: string; multiline?: boolean }
  | { key: string; type: "checkbox"; label: string; hint?: string }
  | { key: string; type: "select"; label: string; hint?: string; options: { value: string; label: string }[] };

export type RowValue = Record<string, string | boolean | { th?: string; en?: string } | null | undefined>;

interface Row {
  key: number;
  value: RowValue;
}

/**
 * A growing list of small records (links, checklist items), each with the
 * same inputs. Posts `<name>.0.<key>` (and `<name>.0.<key>.th` / `.en` for
 * bilingual inputs), which `formDataToObject` turns back into an array.
 * Blank rows are dropped by the action, not here.
 */
export function ObjectListField({
  name,
  label,
  itemLabel,
  hint,
  fields,
  defaultValue = [],
  max = 20,
}: {
  name: string;
  label: string;
  /** Singular, for "Add link" and "Remove link 2". */
  itemLabel: string;
  hint?: ReactNode;
  fields: RowFieldSpec[];
  defaultValue?: RowValue[];
  max?: number;
}) {
  const { errors, locale, markDirty } = useContentForm();
  const nextKey = useRef(defaultValue.length);
  const [rows, setRows] = useState<Row[]>(() => defaultValue.map((value, i) => ({ key: i, value })));
  const [focusKey, setFocusKey] = useState<number | null>(null);

  const move = (index: number, by: -1 | 1) => {
    setRows((cur) => {
      const next = [...cur];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    });
    markDirty();
  };

  const input = (row: Row, index: number, field: RowFieldSpec, first: boolean) => {
    const path = `${name}.${index}.${field.key}`;
    const stored = row.value[field.key];
    if (field.type === "checkbox") {
      return <CheckboxField key={field.key} name={path} label={field.label} hint={field.hint} defaultChecked={stored === true || stored === "on"} />;
    }
    if (field.type === "select") {
      return (
        <Select
          key={field.key}
          id={fieldId(path)}
          name={path}
          label={field.label}
          hint={field.hint}
          error={errors[path]}
          options={field.options}
          defaultValue={typeof stored === "string" ? stored : ""}
          className="max-w-[24rem]"
        />
      );
    }
    if (field.type === "bilingual") {
      const pair = typeof stored === "object" && stored !== null ? stored : {};
      const Field = field.multiline ? Textarea : TextInput;
      return (
        <div key={field.key} className="grid gap-[var(--space-3)] md:grid-cols-2">
          {(["th", "en"] as const).map((lang) => {
            const p = `${path}.${lang}`;
            return (
              <Field
                key={lang}
                id={fieldId(p)}
                name={p}
                lang={lang}
                label={`${field.label} (${a(lang === "th" ? "langThai" : "langEnglish", locale)})`}
                hint={field.hint}
                error={errors[p]}
                defaultValue={pair[lang] ?? ""}
                autoComplete="off"
                autoFocus={focusKey === row.key && first && lang === "th"}
                {...(field.multiline ? { rows: 3 } : {})}
              />
            );
          })}
        </div>
      );
    }
    return (
      <TextInput
        key={field.key}
        id={fieldId(path)}
        name={path}
        type={field.type === "url" ? "url" : "text"}
        inputMode={field.type === "url" ? "url" : undefined}
        label={field.label}
        hint={field.hint}
        error={errors[path]}
        defaultValue={typeof stored === "string" ? stored : ""}
        maxLength={field.maxLength}
        autoComplete="off"
        autoFocus={focusKey === row.key && first}
      />
    );
  };

  const buttonClass = "inline-flex min-h-[var(--target-min)] items-center text-action underline disabled:text-ink-600 disabled:no-underline";

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{label}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {rows.map((row, index) => (
          <li key={row.key} className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]">
            <p className="m-0 text-base font-semibold">
              {itemLabel} {index + 1}
            </p>
            {fields.map((field, i) => input(row, index, field, i === 0))}
            <div className="flex flex-wrap gap-[var(--space-4)]">
              <button type="button" className={buttonClass} disabled={index === 0} onClick={() => move(index, -1)}>
                {a("moveUp", locale)}
                <span className="visually-hidden"> {itemLabel} {index + 1}</span>
              </button>
              <button type="button" className={buttonClass} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                {a("moveDown", locale)}
                <span className="visually-hidden"> {itemLabel} {index + 1}</span>
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setRows((cur) => cur.filter((r) => r.key !== row.key));
                  markDirty();
                }}
              >
                {a("remove", locale)}
                <span className="visually-hidden"> {itemLabel} {index + 1}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length < max ? (
        <button
          type="button"
          onClick={() => {
            const key = nextKey.current++;
            setRows((cur) => [...cur, { key, value: {} }]);
            setFocusKey(key);
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
