"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorMessage, Radios, Select, Textarea, TextInput, type RadioOption, type SelectOption } from "@/components/ui";
import { describedBy } from "@/lib/a11y";
import { fieldId } from "@/lib/admin/content/form-state";
import { slugify } from "@/lib/admin/content/slug";
import { a } from "@/lib/i18n/admin";
import { LOCALES, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import { useContentForm } from "./context";
import { useDocumentLanguage } from "./document-language";
import { useRepeater } from "@/components/admin/hooks/use-repeater";
import { AddRowButton, RepeaterStatus, RowActions } from "./RowButtons";
import inline from "./inline-field.module.css";

/**
 * Form controls for content forms. Each takes the field's `name` (dotted for
 * nested values, "title.th"), uses `fieldId(name)` as its id so the error
 * summary can link to it, and reads its error from the surrounding
 * `ContentForm`. Pass the stored value as `defaultValue`.
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
  /** Initial textarea rows in structured forms. The document canvas fits the text. */
  rows?: number;
  /** Typography on the document canvas. */
  appearance?: "title" | "lead" | "text";
}

function Counted({ value, max }: { value: string; max: number }) {
  return (
    <p aria-hidden="true" className={`m-0 text-sm ${value.length > max ? "font-medium text-error" : "text-ink-600"}`}>
      {value.length} / {max}
    </p>
  );
}

function LanguageField({ name, lang, label, hint, defaultValue, maxLength, multiline, rows, appearance = "text", activeLanguage }: BilingualProps & { lang: Locale; activeLanguage?: Locale }) {
  const { errors, locale, formId } = useContentForm();
  const path = `${name}.${lang}`;
  const id = fieldId(path);
  const error = errors[path];
  const singleLine = activeLanguage !== undefined && !multiline;
  const initialValue = defaultValue?.[lang] ?? "";
  const [value, setValue] = useState(initialValue);
  const language = a(lang === "th" ? "langThai" : "langEnglish", locale);
  const translatedLabel = `${label} (${language})`;
  const common = {
    id,
    name: path,
    form: formId,
    value,
    onChange: (e: { target: { value: string } }) => setValue(singleLine ? e.target.value.replace(/[\r\n]+/g, " ") : e.target.value),
    autoComplete: "off",
  };
  const count = maxLength ? <Counted value={value} max={maxLength} /> : null;

  if (activeLanguage) {
    const control = {
      ...common,
      "aria-describedby": describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(error) }),
      "aria-invalid": error ? true as const : undefined,
      className: inline.control,
      placeholder: label,
    };
    return (
      <div data-content-language={lang} hidden={lang !== activeLanguage}>
        <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <label htmlFor={id} className="text-sm font-medium text-ink-600">{translatedLabel}</label>
          <div className={inline.surface} data-appearance={appearance} lang={lang}>
            <span aria-hidden="true" className={inline.measure}>{value || label}{"\u200b"}</span>
            <textarea
              {...control}
              rows={1}
              onKeyDown={singleLine ? (event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
              } : undefined}
            />
          </div>
          {hint ? <p id={`${id}-hint`} className="m-0 text-sm text-ink-600">{hint}</p> : null}
          {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
          {count}
        </div>
      </div>
    );
  }

  const options = { ...common, lang, label: translatedLabel, hint, error };
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
      {multiline ? <Textarea {...options} rows={rows ?? 5} /> : <TextInput {...options} />}
      {count}
    </div>
  );
}

/** The canvas displays the active language while keeping both values in the form. */
export function BilingualTextField(props: BilingualProps) {
  const documentLanguage = useDocumentLanguage();
  const language = documentLanguage?.language;
  // In a repeater, the active control needs to be first for add/remove focus.
  const languages = language ? [language, OTHER_LOCALE[language]] : LOCALES;
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {languages.map((lang) => <LanguageField key={lang} {...props} lang={lang} activeLanguage={language} />)}
    </div>
  );
}

/** Same as `BilingualTextField` with multi-line editing. */
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
  const { errors, formId } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      form={formId}
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

/** A one-language multi-line box. */
export function TextareaField({ name, label, hint, defaultValue, className, rows = 4 }: SingleProps & { rows?: number }) {
  const { errors, formId } = useContentForm();
  return (
    <Textarea
      id={fieldId(name)}
      name={name}
      form={formId}
      label={label}
      hint={hint}
      error={errors[name]}
      defaultValue={defaultValue ?? ""}
      autoComplete="off"
      rows={rows}
      className={className}
    />
  );
}

/** Date and time in Thailand time; `defaultValue` from `formatBangkokDateTime`. */
export function DateTimeField({ name, label, hint, defaultValue, className }: SingleProps) {
  const { errors, locale, formId } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      form={formId}
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
  const { errors, formId } = useContentForm();
  return (
    <TextInput
      id={fieldId(name)}
      name={name}
      form={formId}
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
  const { errors, formId } = useContentForm();
  return (
    <Select
      id={fieldId(name)}
      name={name}
      form={formId}
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
  const { errors, formId } = useContentForm();
  const id = fieldId(name);
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[var(--target-min)] items-start gap-[var(--space-2)]">
        <input
          type="checkbox"
          id={id}
          name={name}
          form={formId}
          defaultChecked={defaultChecked}
          aria-describedby={describedBy(id, { hasHint: Boolean(hint), hasError: Boolean(errors[name]) })}
          aria-invalid={errors[name] ? true : undefined}
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
      {errors[name] ? <ErrorMessage id={`${id}-error`}>{errors[name]}</ErrorMessage> : null}
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
  const { errors, locale, formId } = useContentForm();
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const followed = useRef(!defaultValue);

  useEffect(() => {
    const form = ref.current?.querySelector("input")?.form;
    const source = form?.elements.namedItem(suggestFrom);
    if (!(source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement)) return;
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
      form={formId}
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
  const { errors, locale, markDirty, formId } = useContentForm();
  const list = useRepeater(defaultValue, { locale, itemLabel, max, onChange: markDirty });

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{label}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      <RepeaterStatus message={list.message} />
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
        {list.rows.map((row, index) => (
          <li key={row.key} ref={list.rowRef(row.key)} className="flex flex-col gap-[var(--space-2)] rounded-panel border border-line p-[var(--space-3)]">
            <div className="flex flex-col gap-[var(--space-3)]">
              {(["th", "en"] as const).map((lang) => {
                const path = `${name}.${index}.${lang}`;
                return (
                  <TextInput
                    key={lang}
                    id={fieldId(path)}
                    name={path}
                    form={formId}
                    lang={lang}
                    label={`${itemLabel} ${index + 1} (${a(lang === "th" ? "langThai" : "langEnglish", locale)})`}
                    defaultValue={row.value[lang]}
                    error={errors[path]}
                    autoComplete="off"
                  />
                );
              })}
            </div>
            <RowActions
              locale={locale}
              label={`${itemLabel} ${index + 1}`}
              onRemove={() => list.remove(row.key)}
            />
          </li>
        ))}
      </ul>
      {list.canAdd ? <AddRowButton addRef={list.addRef} label={a("listAddItem", locale, { item: itemLabel.toLowerCase() })} onClick={() => list.add({ th: "", en: "" })} /> : null}
    </fieldset>
  );
}
