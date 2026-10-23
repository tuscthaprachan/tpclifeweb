"use client";

import { useState } from "react";
import { Fieldset, Select } from "@/components/ui";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { useContentForm } from "./context";

export interface ReferenceChoice {
  value: string;
  label: { th: string; en: string };
}

interface ReferencePickerProps {
  /** Form name. One value for a single pick, one per chosen row for several. */
  name: string;
  label: string;
  hint?: string;
  options: ReferenceChoice[];
  defaultValue?: string | string[] | null;
  /** Choose several. A filterable tick list instead of a drop-down. */
  multiple?: boolean;
  /** Text of the empty choice in the drop-down. */
  emptyLabel?: string;
  /** Called with the chosen id(s), for callers that hold the value themselves (rich text dialogs). */
  onChange?: (value: string[]) => void;
  /** Do not post; the caller reads `onChange`. */
  unnamed?: boolean;
}

/** Choose one or many rows of another table by title, shown in the staff member's language. */
export function ReferencePicker({ name, label, hint, options, defaultValue, multiple = false, emptyLabel, onChange, unnamed }: ReferencePickerProps) {
  const { errors, locale, markDirty } = useContentForm();
  const id = fieldId(name);
  const labelOf = (o: ReferenceChoice) => pick(o.label, locale) || pick({ th: o.label.en, en: o.label.th }, locale) || a("untitled", locale);
  const initial = defaultValue == null ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  const [selected, setSelected] = useState<string[]>(initial);
  const [filter, setFilter] = useState("");

  if (!multiple) {
    return (
      <Select
        id={id}
        name={unnamed ? undefined : name}
        label={label}
        hint={hint}
        error={errors[name]}
        value={selected[0] ?? ""}
        onChange={(e) => {
          const next = e.target.value ? [e.target.value] : [];
          setSelected(next);
          onChange?.(next);
        }}
        options={[{ value: "", label: emptyLabel ?? a("choiceNone", locale) }, ...options.map((o) => ({ value: o.value, label: labelOf(o) }))]}
        className="max-w-[32rem]"
      />
    );
  }

  const shown = options.filter((o) => !filter.trim() || `${o.label.th} ${o.label.en}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const toggle = (value: string, on: boolean) => {
    const next = on ? [...selected, value] : selected.filter((v) => v !== value);
    setSelected(next);
    markDirty();
    onChange?.(next);
  };

  return (
    <Fieldset legend={label} hint={hint} error={errors[name]} id={id}>
      <div className="flex flex-col gap-[var(--space-2)]">
        {options.length > 8 ? (
          <input
            type="search"
            aria-label={a("filterChoices", locale)}
            placeholder={a("filterChoices", locale)}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            className="min-h-[var(--target-min)] max-w-[24rem] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)]"
          />
        ) : null}
        {options.length === 0 ? <p className="m-0 text-sm text-ink-600">{a("choicesEmpty", locale)}</p> : null}
        <div className="flex max-h-[16rem] flex-col gap-[var(--space-1)] overflow-y-auto">
          {shown.map((o, index) => (
            <label key={o.value} className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input
                id={index === 0 ? id : undefined}
                type="checkbox"
                name={unnamed ? undefined : name}
                value={o.value}
                checked={selected.includes(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
                className="size-5 shrink-0"
              />
              {labelOf(o)}
            </label>
          ))}
        </div>
        {/* Keeps chosen rows posted while the filter hides their tick boxes. */}
        {!unnamed ? selected.filter((v) => !shown.some((o) => o.value === v)).map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
      </div>
    </Fieldset>
  );
}
