"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Radios, Select, Textarea, TextInput, type RadioOption, type SelectOption } from "@/components/ui";
import { fieldId } from "@/lib/admin/content/form-state";
import { slugify } from "@/lib/admin/content/slug";
import { a } from "@/lib/i18n/admin";
import { useContentForm } from "./context";
import { AddRowButton, RowActions } from "./RowButtons";

/**
 * Form controls for content forms. Each takes the field's `name` (dotted for
 * nested values, "title.th"), uses `fieldId(name)` as its id so the error
 * summary can link to it, and reads its error from the surrounding
 * `ContentForm`. They are uncontrolled: pass the stored value as
 * `defaultValue`.
 */

interface BilingualProps {
  /** Form name; the controls are `<name>.th` and `<name>.en`. */
  name: string;
  label: string;
  hint?: ReactNode;
  defaultValue?: { th?: string | null; en?: string | null };
  /** Shows "n / max" under each box. */
  maxLength?: number;
  /** A textarea instead of a one-line input. */
  multiline?: boolean;
  rows?: number;
}

function Counted({ value, max }: { value: string; max: number }) {
  return (
    <p aria-hidden="true" className={`m-0 text-sm ${value.length > max ? "font-medium text-error" : "text-ink-600"}`}>
      {value.length} / {max}
    </p>
  );
}

function LanguageBox({ name, lang, label, hint, defaultValue, maxLength, multiline, rows }: BilingualProps & { lang: "th" | "en" }) {
  const { errors, locale } = useContentForm();
  const path = `${name}.${lang}`;
  const [value, setValue] = useState(defaultValue?.[lang] ?? "");
  const language = a(lang === "th" ? "langThai" : "langEnglish", locale);
  const common = {
    id: fieldId(path),
    name: path,
    label: `${label} (${language})`,
    hint,
    error: errors[path],
    lang,
    value,
    onChange: (e: { target: { value: string } }) => setValue(e.target.value),
    autoComplete: "off",
  };
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
      {multiline ? <Textarea {...common} rows={rows ?? 5} /> : <TextInput {...common} />}
      {maxLength ? <Counted value={value} max={maxLength} /> : null}
    </div>
  );
}

/** Thai and English side by side, stacked on a narrow screen. */
export function BilingualTextField(props: BilingualProps) {
  return (
    <div className="grid gap-[var(--space-4)] md:grid-cols-2">
      <LanguageBox {...props} lang="th" />
      <LanguageBox {...props} lang="en" />
    </div>
  );
}

/** Same as `BilingualTextField` with multi-line boxes. */
export function BilingualTextarea(props: BilingualProps) {
  return <BilingualTextField {...props} multiline />;
}

interface SingleProps {
  name: string;
  label: string;
  hint?: ReactNode;
  defaultValue?: string | null;
  className?: string;
}

/** A one-language text input. `type` can be "url", "email", "text" (default) or "number". */
export function TextField({ name, label, hint, defaultValue, className, type = "text", ...rest }: SingleProps & { type?: string; maxLength?: number; inputMode?: "numeric" | "url" | "text" }) {
  const { errors } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      type={type}
      label={label}
      hint={hint}
      error={errors[name]}
      defaultValue={defaultValue ?? ""}
      autoComplete="off"
      className={className}
      {...rest}
    />
  );
}

/** Date and time in Thailand time; `defaultValue` from `formatBangkokDateTime`. */
export function DateTimeField({ name, label, hint, defaultValue, className }: SingleProps) {
  const { errors, locale } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      type="datetime-local"
      label={label}
      hint={hint ?? a("hintThailandTime", locale)}
      error={errors[name]}
      defaultValue={defaultValue ?? ""}
      className={className ?? "max-w-[20rem]"}
    />
  );
}

/** A calendar date. */
export function DateField({ name, label, hint, defaultValue, className }: SingleProps) {
  const { errors } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      type="date"
      label={label}
      hint={hint}
      error={errors[name]}
      defaultValue={defaultValue ?? ""}
      className={className ?? "max-w-[16rem]"}
    />
  );
}

/** A drop-down list. Add an empty option yourself (`{ value: "", label: "None" }`) when the field is optional. */
export function EnumSelect({ name, label, hint, defaultValue, options, className }: SingleProps & { options: SelectOption[] }) {
  const { errors } = useContentForm();
  return (
    <Select
      id={fieldId(name)}
      name={name}
      label={label}
      hint={hint}
      error={errors[name]}
      options={options}
      defaultValue={defaultValue ?? ""}
      className={className ?? "max-w-[24rem]"}
    />
  );
}

/** Radio buttons, for a short list where seeing every choice helps. */
export function EnumRadios({ name, label, hint, defaultValue, options, className }: SingleProps & { options: RadioOption[] }) {
  const { errors } = useContentForm();
  return (
    <Radios
      id={fieldId(name)}
      name={name}
      legend={label}
      hint={hint}
      error={errors[name]}
      options={options}
      defaultValue={defaultValue ?? undefined}
      className={className}
    />
  );
}

/** A single tick box. Posts "on" when ticked; read it with `fieldKit(...).checkbox()`. */
export function CheckboxField({ name, label, hint, defaultChecked }: { name: string; label: ReactNode; hint?: ReactNode; defaultChecked?: boolean }) {
  const { errors } = useContentForm();
  const id = fieldId(name);
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[var(--target-min)] items-start gap-[var(--space-2)]">
        <input
          type="checkbox"
          id={id}
          name={name}
          defaultChecked={defaultChecked}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="m-0 mt-[calc((var(--target-min)-1.25rem)/2)] size-5 min-h-0 min-w-0 shrink-0"
        />
        <label htmlFor={id} className="flex min-h-[var(--target-min)] flex-1 flex-col justify-center text-base text-ink-900">
          {label}
          {hint ? (
            <span id={`${id}-hint`} className="block text-sm text-ink-600">
              {hint}
            </span>
          ) : null}
        </label>
      </div>
      {errors[name] ? <p className="m-0 text-base font-medium text-error">{errors[name]}</p> : null}
    </div>
  );
}

/**
 * The address-bar name of a page. While the box is empty (a new item) it
 * follows what is typed in the `suggestFrom` field, normally the English
 * title; once the staff member edits it, or when editing a saved item, it
 * stays put, because changing a published address breaks links.
 */
export function SlugField({ name = "slug", label, hint, defaultValue, suggestFrom = "title.en" }: { name?: string; label: string; hint?: ReactNode; defaultValue?: string; suggestFrom?: string }) {
  const { errors, locale } = useContentForm();
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const followed = useRef(!defaultValue);

  useEffect(() => {
    const form = ref.current?.querySelector("input")?.form;
    const source = form?.elements.namedItem(suggestFrom);
    if (!form || !(source instanceof HTMLInputElement)) return;
    const onInput = () => {
      if (followed.current) setValue(slugify(source.value));
    };
    source.addEventListener("input", onInput);
    return () => source.removeEventListener("input", onInput);
  }, [suggestFrom]);

  return (
    <div ref={ref}>
    <TextInput
      id={fieldId(name)}
      name={name}
      label={label}
      hint={hint ?? a("hintSlug", locale)}
      error={errors[name]}
      value={value}
      onChange={(e) => {
        followed.current = false;
        setValue(e.target.value);
      }}
      autoComplete="off"
      spellCheck={false}
      autoCapitalize="none"
      className="max-w-[32rem]"
    />
    </div>
  );
}

/**
 * A growing list of Thai and English pairs (tags, short labels). Posts
 * `<name>.0.th`, `<name>.0.en`, `<name>.1.th`... Blank rows are dropped by
 * the action, not here.
 */
export function BilingualListField({
  name,
  label,
  itemLabel,
  hint,
  defaultValue = [],
  max = 20,
}: {
  name: string;
  label: string;
  /** Singular, for "Add tag" and "Remove tag 2". */
  itemLabel: string;
  hint?: ReactNode;
  defaultValue?: { th: string; en: string }[];
  max?: number;
}) {
  const { errors, locale, markDirty } = useContentForm();
  const nextKey = useRef(defaultValue.length);
  const [rows, setRows] = useState(() => defaultValue.map((value, i) => ({ key: i, value })));
  const [focusKey, setFocusKey] = useState<number | null>(null);

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{label}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {rows.map((row, index) => (
          <li key={row.key} className="flex flex-col gap-[var(--space-2)] rounded-panel border border-line p-[var(--space-3)]">
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              {(["th", "en"] as const).map((lang) => {
                const path = `${name}.${index}.${lang}`;
                return (
                  <TextInput
                    key={lang}
                    id={fieldId(path)}
                    name={path}
                    lang={lang}
                    label={`${itemLabel} ${index + 1} (${a(lang === "th" ? "langThai" : "langEnglish", locale)})`}
                    defaultValue={row.value[lang]}
                    error={errors[path]}
                    autoComplete="off"
                    autoFocus={focusKey === row.key && lang === "th"}
                  />
                );
              })}
            </div>
            <RowActions
              locale={locale}
              label={`${itemLabel} ${index + 1}`}
              onRemove={() => {
                setRows((cur) => cur.filter((r) => r.key !== row.key));
                markDirty();
              }}
            />
          </li>
        ))}
      </ul>
      {rows.length < max ? (
        <AddRowButton
          label={a("listAddItem", locale, { item: itemLabel.toLowerCase() })}
          onClick={() => {
            const key = nextKey.current++;
            setRows((cur) => [...cur, { key, value: { th: "", en: "" } }]);
            setFocusKey(key);
            markDirty();
          }}
        />
      ) : null}
    </fieldset>
  );
}
