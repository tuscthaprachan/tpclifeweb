"use client";

import { useId, useRef, useState } from "react";
import { describedBy } from "@/lib/a11y";

export interface MentionPerson {
  id: string;
  name: string;
}

export interface MentionLabels {
  list: string;
  count: (n: number) => string;
  none: string;
}

const TRIGGER = /(?:^|[\s(])@([^@\n]{0,40})$/u;

/**
 * A textarea that offers staff names after an `@`. Without JavaScript it is a
 * plain textarea and typing `@Name` still works, because the server matches
 * names itself. With it, the names that fit what is typed appear as a list of
 * buttons under the field (ArrowDown moves into the list, Enter picks, Escape
 * closes); picking one writes `@Name` and records the person's id so two
 * people with the same name stay apart.
 */
export function MentionTextarea({
  id,
  name,
  label,
  hint,
  defaultValue,
  rows = 4,
  maxLength,
  people,
  labels,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  people: MentionPerson[];
  labels: MentionLabels;
}) {
  const listId = useId();
  const area = useRef<HTMLTextAreaElement | null>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

  const matches =
    query === null
      ? []
      : people
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .sort((x, y) => Number(y.name.toLowerCase().startsWith(query.toLowerCase())) - Number(x.name.toLowerCase().startsWith(query.toLowerCase())))
          .slice(0, 8);

  const detect = () => {
    const el = area.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const found = TRIGGER.exec(before);
    setQuery(found ? found[1]! : null);
  };

  const pick = (person: MentionPerson) => {
    const el = area.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = el.value.slice(0, caret);
    const found = TRIGGER.exec(before);
    if (!found) return;
    const start = caret - found[1]!.length - 1;
    const inserted = `@${person.name} `;
    el.value = el.value.slice(0, start) + inserted + el.value.slice(caret);
    const next = start + inserted.length;
    el.focus();
    el.setSelectionRange(next, next);
    setChosen((c) => (c.includes(person.id) ? c : [...c, person.id]));
    setQuery(null);
  };

  const open = query !== null && people.length > 0;

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <label htmlFor={id} className="text-base font-medium text-ink-900">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <textarea
        ref={area}
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-describedby={describedBy(id, { hasHint: Boolean(hint), hasError: false })}
        className="rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
        onInput={detect}
        onClick={detect}
        onKeyUp={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "Escape") detect();
        }}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setQuery(null);
          } else if (event.key === "ArrowDown" && matches.length > 0) {
            event.preventDefault();
            options.current[0]?.focus();
          }
        }}
      />
      {chosen.map((personId) => (
        <input key={personId} type="hidden" name="mention" value={personId} />
      ))}
      <p role="status" className="visually-hidden">
        {open ? (matches.length > 0 ? labels.count(matches.length) : labels.none) : ""}
      </p>
      {open ? (
        <div role="group" aria-label={labels.list} id={listId} className="flex flex-col rounded-control border border-line-strong bg-surface">
          {matches.length === 0 ? (
            <p className="m-0 px-[var(--space-3)] py-[var(--space-2)] text-ink-600">{labels.none}</p>
          ) : (
            matches.map((person, index) => (
              <button
                key={person.id}
                ref={(el) => {
                  options.current[index] = el;
                }}
                type="button"
                className="min-h-[var(--target-min)] px-[var(--space-3)] py-[var(--space-2)] text-left text-ink-900 hover:bg-surface-alt focus-visible:bg-surface-alt"
                onClick={() => pick(person)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    options.current[Math.min(index + 1, matches.length - 1)]?.focus();
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (index === 0) area.current?.focus();
                    else options.current[index - 1]?.focus();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuery(null);
                    area.current?.focus();
                  }
                }}
              >
                @{person.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
