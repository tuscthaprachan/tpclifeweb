"use client";

import { useRef, useState, type ReactNode } from "react";
import { Select, Textarea, TextInput, type SelectOption } from "@/components/ui";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";

/**
 * Growing lists on the policy form: progress updates and evidence links.
 * They post `updates.0.date`, `updates.0.note.th` ... and `evidence.0.url` ...
 * Rows left completely blank are ignored by the action.
 */

function useRows<T>(initial: T[]) {
  const next = useRef(initial.length);
  const [rows, setRows] = useState(() => initial.map((value, i) => ({ key: i, value })));
  const [focusKey, setFocusKey] = useState<number | null>(null);
  return {
    rows,
    focusKey,
    remove: (key: number) => setRows((cur) => cur.filter((r) => r.key !== key)),
    add: (value: T) => {
      const key = next.current++;
      setRows((cur) => [...cur, { key, value }]);
      setFocusKey(key);
    },
  };
}

function RepeaterShell({
  legend,
  hint,
  addLabel,
  onAdd,
  children,
}: {
  legend: string;
  hint?: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{legend}</legend>
      {hint ? <p className="mb-[var(--space-2)] text-sm text-ink-600">{hint}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">{children}</ul>
      <button
        type="button"
        onClick={onAdd}
        className="mt-[var(--space-3)] inline-flex min-h-[var(--target-min)] items-center rounded-control border border-line-strong bg-surface px-[var(--space-4)] py-[var(--space-2)] font-medium"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

function RowShell({ title, removeLabel, onRemove, children }: { title: string; removeLabel: string; onRemove: () => void; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]">
      <p className="m-0 font-semibold text-ink-900">{title}</p>
      {children}
      <div>
        <button type="button" onClick={onRemove} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
          {removeLabel}
        </button>
      </div>
    </li>
  );
}

export interface UpdateRowValue {
  date: string;
  note: { th: string; en: string };
  status: string;
  author: { th: string; en: string };
  evidenceUrl: string;
}

/** The update history: date, note in both languages, status on that date, who recorded it and an evidence link. */
export function PolicyUpdatesField({
  defaultValue,
  statusOptions,
  newRow,
}: {
  defaultValue: UpdateRowValue[];
  statusOptions: SelectOption[];
  /** Starting values of a freshly added row (today, the policy's status). */
  newRow: UpdateRowValue;
}) {
  const { errors, locale, markDirty } = useContentForm();
  const { rows, focusKey, remove, add } = useRows(defaultValue);
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const lang = (l: "th" | "en") => ` (${a(l === "th" ? "langThai" : "langEnglish", locale)})`;

  return (
    <RepeaterShell
      legend={L("policiesFieldUpdates")}
      hint={L("policiesHintUpdates")}
      addLabel={a("listAddItem", locale, { item: L("policiesFieldUpdate") })}
      onAdd={() => {
        add(newRow);
        markDirty();
      }}
    >
      {rows.map((row, index) => {
        const p = `updates.${index}`;
        return (
          <RowShell
            key={row.key}
            title={`${L("policiesFieldUpdate")} ${index + 1}`}
            removeLabel={`${L("remove")} ${L("policiesFieldUpdate")} ${index + 1}`}
            onRemove={() => {
              remove(row.key);
              markDirty();
            }}
          >
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              <TextInput
                id={fieldId(`${p}.date`)}
                name={`${p}.date`}
                type="date"
                label={L("policiesFieldUpdateDate")}
                defaultValue={row.value.date}
                error={errors[`${p}.date`]}
                autoFocus={focusKey === row.key}
              />
              <Select
                id={fieldId(`${p}.status`)}
                name={`${p}.status`}
                label={L("policiesFieldUpdateStatus")}
                options={statusOptions}
                defaultValue={row.value.status}
                error={errors[`${p}.status`]}
              />
            </div>
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              {(["th", "en"] as const).map((l) => (
                <Textarea
                  key={l}
                  id={fieldId(`${p}.note.${l}`)}
                  name={`${p}.note.${l}`}
                  lang={l}
                  rows={3}
                  label={`${L("policiesFieldUpdateNote")}${lang(l)}`}
                  defaultValue={row.value.note[l]}
                  error={errors[`${p}.note.${l}`]}
                />
              ))}
            </div>
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              {(["th", "en"] as const).map((l) => (
                <TextInput
                  key={l}
                  id={fieldId(`${p}.author.${l}`)}
                  name={`${p}.author.${l}`}
                  lang={l}
                  label={`${L("policiesFieldUpdateAuthor")}${lang(l)}`}
                  defaultValue={row.value.author[l]}
                  error={errors[`${p}.author.${l}`]}
                  autoComplete="off"
                />
              ))}
            </div>
            <TextInput
              id={fieldId(`${p}.evidenceUrl`)}
              name={`${p}.evidenceUrl`}
              type="url"
              inputMode="url"
              label={L("policiesFieldUpdateEvidence")}
              defaultValue={row.value.evidenceUrl}
              error={errors[`${p}.evidenceUrl`]}
              autoComplete="off"
            />
          </RowShell>
        );
      })}
    </RepeaterShell>
  );
}

export interface EvidenceRowValue {
  label: { th: string; en: string };
  url: string;
  description: { th: string; en: string };
  requiresSignIn: boolean;
}

/** Evidence links shown on the policy page. */
export function EvidenceLinksField({ defaultValue }: { defaultValue: EvidenceRowValue[] }) {
  const { errors, locale, markDirty } = useContentForm();
  const { rows, focusKey, remove, add } = useRows(defaultValue);
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const lang = (l: "th" | "en") => ` (${a(l === "th" ? "langThai" : "langEnglish", locale)})`;
  const blank: EvidenceRowValue = { label: { th: "", en: "" }, url: "", description: { th: "", en: "" }, requiresSignIn: false };

  return (
    <RepeaterShell
      legend={L("policiesFieldEvidence")}
      hint={L("policiesHintEvidence")}
      addLabel={a("listAddItem", locale, { item: L("policiesFieldEvidenceItem") })}
      onAdd={() => {
        add(blank);
        markDirty();
      }}
    >
      {rows.map((row, index) => {
        const p = `evidence.${index}`;
        return (
          <RowShell
            key={row.key}
            title={`${L("policiesFieldEvidenceItem")} ${index + 1}`}
            removeLabel={`${L("remove")} ${L("policiesFieldEvidenceItem")} ${index + 1}`}
            onRemove={() => {
              remove(row.key);
              markDirty();
            }}
          >
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              {(["th", "en"] as const).map((l) => (
                <TextInput
                  key={l}
                  id={fieldId(`${p}.label.${l}`)}
                  name={`${p}.label.${l}`}
                  lang={l}
                  label={`${L("policiesFieldLinkLabel")}${lang(l)}`}
                  defaultValue={row.value.label[l]}
                  error={errors[`${p}.label.${l}`]}
                  autoComplete="off"
                  autoFocus={focusKey === row.key && l === "th"}
                />
              ))}
            </div>
            <TextInput
              id={fieldId(`${p}.url`)}
              name={`${p}.url`}
              label={L("policiesFieldLinkUrl")}
              inputMode="url"
              defaultValue={row.value.url}
              error={errors[`${p}.url`]}
              autoComplete="off"
            />
            <div className="grid gap-[var(--space-3)] md:grid-cols-2">
              {(["th", "en"] as const).map((l) => (
                <TextInput
                  key={l}
                  id={fieldId(`${p}.description.${l}`)}
                  name={`${p}.description.${l}`}
                  lang={l}
                  label={`${L("policiesFieldLinkDescription")}${lang(l)}`}
                  defaultValue={row.value.description[l]}
                  error={errors[`${p}.description.${l}`]}
                  autoComplete="off"
                />
              ))}
            </div>
            <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name={`${p}.requiresSignIn`} defaultChecked={row.value.requiresSignIn} className="size-5 shrink-0" />
              {L("policiesFieldLinkSignIn")}
            </label>
          </RowShell>
        );
      })}
    </RepeaterShell>
  );
}
