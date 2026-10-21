"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { AVOID_KEYS, DIET_KEYS, type AvoidKey, type DietKey } from "@/lib/canteen/params";
import { MAX_NAME_LENGTH, MAX_PEOPLE, type Person } from "@/lib/canteen/group";
import type { Locale } from "@/lib/i18n/config";

import { AVOID_LABEL, DIET_SHORT_LABEL } from "../labels";
import { GROUP, group } from "./strings";
import {
  blankPerson,
  groupHref,
  personLabel,
  toggleKey,
  type Strategy,
} from "./state";

interface GroupBuilderProps {
  locale: Locale;
  /** The page path, for example "/th/eat/group". The form is a GET to it. */
  action: string;
  /** The people in the URL. At least one (a blank one when the URL has none). */
  initialPeople: Person[];
  strategy: Strategy;
  seed?: string;
}

interface Row {
  key: number;
  person: Person;
}

const noopSubscribe = () => () => {};

/**
 * The people builder. It is a plain GET form first: every person is a
 * fieldset with named fields (`n0`, `max0`, `d0`, `a0`, `s0`), and "Add
 * another person", each "Remove" and "Show results" are submit buttons that
 * send `act`. The server turns the fields into the compact `p` URL and
 * redirects, and the form is rendered again from `p`, so with JavaScript off
 * the whole thing round trips.
 *
 * With JavaScript the same markup becomes instant: add and remove change
 * state in place, the address bar follows (history.replaceState), and Show
 * results navigates to the compact URL. A Share box with a Copy button is
 * added; without JavaScript it is a read only input.
 */
export function GroupBuilder({ locale, action, initialPeople, strategy, seed }: GroupBuilderProps) {
  const nextKey = useRef(initialPeople.length);
  const [rows, setRows] = useState<Row[]>(() => initialPeople.map((person, key) => ({ key, person })));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const focusKey = useRef<number | null>(null);
  const people = rows.map((row) => row.person);
  const full = rows.length >= MAX_PEOPLE;
  const personWord = (num: number) => group.person(num, locale);

  // The address bar follows the group once it has been edited, so a reload or a copied URL is current.
  useEffect(() => {
    if (!dirty) return;
    const href = groupHref(action, { people, strategy, seed });
    window.history.replaceState(window.history.state, "", href);
    // Only the people changing should rewrite the address bar, not a later tab or reroll link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // After adding someone, the cursor goes to their name box.
  useEffect(() => {
    if (focusKey.current === null) return;
    const input = document.getElementById(`group-${focusKey.current}-name`);
    focusKey.current = null;
    if (input instanceof HTMLInputElement) input.focus();
  });

  function update(key: number, patch: Partial<Person>) {
    setDirty(true);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, person: { ...row.person, ...patch } } : row)));
  }

  function add() {
    if (full) return;
    const key = nextKey.current;
    nextKey.current += 1;
    focusKey.current = key;
    setDirty(true);
    setRows((current) => [...current, { key, person: blankPerson() }]);
    setStatus(group.addedStatus(rows.length + 1, rows.length + 1, locale));
  }

  function remove(key: number) {
    const index = rows.findIndex((row) => row.key === key);
    const row = rows[index];
    if (!row) return;
    const label = personLabel(row.person, index, personWord);
    const remaining = rows.filter((entry) => entry.key !== key);
    setDirty(true);
    if (remaining.length === 0) {
      const blank = { key: nextKey.current, person: blankPerson() };
      nextKey.current += 1;
      setRows([blank]);
      setStatus(group.removedStatus(label, 1, locale));
    } else {
      setRows(remaining);
      setStatus(group.removedStatus(label, remaining.length, locale));
    }
    // The removed button is gone, so focus goes to the announcement, which sits above the people.
    window.setTimeout(() => statusRef.current?.focus(), 0);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDirty(false);
    // The address bar already follows the edits, so a router push would see no change.
    // A plain navigation always asks the server for results for exactly these people.
    const target = groupHref(action, { people, strategy, seed }, "results");
    const here = `${window.location.pathname}${window.location.search}`;
    window.location.assign(target);
    if (target.split("#")[0] === here) window.location.reload();
  }

  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const shareValue = `${origin}${groupHref(action, { people, strategy, seed })}`;

  return (
    <form method="get" action={action} onSubmit={onSubmit} className="flex flex-col gap-[var(--space-6)]" aria-labelledby="builder">
      {/* Enter in a text box must mean "Show results", not the first Remove button. */}
      <button type="submit" name="act" value="show" hidden tabIndex={-1} aria-hidden="true" />
      <input type="hidden" name="strat" value={strategy} />
      {seed ? <input type="hidden" name="seed" value={seed} /> : null}

      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="m-0 text-base font-medium text-ink-900 empty:hidden">
        {status}
      </p>

      <ol className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
        {rows.map((row, index) => (
          <li key={row.key}>
            <PersonFieldset
              locale={locale}
              index={index}
              rowKey={row.key}
              person={row.person}
              canRemove={rows.length > 1}
              onChange={(patch) => update(row.key, patch)}
              onRemove={() => remove(row.key)}
            />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-[var(--space-3)]">
        {full ? (
          <p className="m-0 text-ink-900">{GROUP.limitReached[locale]}</p>
        ) : (
          <Button
            type="submit"
            name="act"
            value="add"
            variant="secondary"
            className="scroll-my-24"
            onClick={(event) => {
              event.preventDefault();
              add();
            }}
          >
            {GROUP.addPerson[locale]}
          </Button>
        )}
        <Button type="submit" name="act" value="show" className="scroll-my-24">
          {GROUP.showResults[locale]}
        </Button>
      </div>

      {dirty ? (
        <p role="status" className="m-0 text-sm text-ink-600">
          {GROUP.dirtyNote[locale]}
        </p>
      ) : null}

      <ShareBox locale={locale} value={shareValue} hydrated={origin !== ""} />
    </form>
  );
}

interface PersonFieldsetProps {
  locale: Locale;
  index: number;
  rowKey: number;
  person: Person;
  canRemove: boolean;
  onChange: (patch: Partial<Person>) => void;
  onRemove: () => void;
}

function PersonFieldset({ locale, index, rowKey, person, canRemove, onChange, onRemove }: PersonFieldsetProps) {
  const num = index + 1;
  const legend = group.person(num, locale);
  const id = `group-${rowKey}`;

  return (
    <fieldset
      id={`person-${num}`}
      className="m-0 flex scroll-mt-[var(--space-8)] flex-col gap-[var(--space-4)] rounded-panel border border-line bg-surface p-[var(--space-4)]"
    >
      <legend className="px-[var(--space-1)] text-lg font-semibold text-ink-900">{legend}</legend>

      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor={`${id}-name`} className="text-base font-medium text-ink-900">
            {GROUP.nameLabel[locale]}
          </label>
          <p id={`${id}-name-hint`} className="m-0 text-sm text-ink-600">
            {GROUP.nameHint[locale]}
          </p>
          <input
            id={`${id}-name`}
            name={`n${index}`}
            type="text"
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            aria-describedby={`${id}-name-hint`}
            value={person.name}
            onChange={(event) => onChange({ name: event.target.value })}
            dir="auto"
            className="scroll-my-24 min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
          />
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor={`${id}-max`} className="text-base font-medium text-ink-900">
            {GROUP.budgetLabel[locale]}
          </label>
          <p id={`${id}-max-hint`} className="m-0 text-sm text-ink-600">
            {GROUP.budgetHint[locale]}
          </p>
          <input
            id={`${id}-max`}
            name={`max${index}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            step={1}
            aria-describedby={`${id}-max-hint`}
            value={person.max ?? ""}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange({ max: event.target.value !== "" && Number.isInteger(value) && value >= 1 ? value : undefined });
            }}
            className="scroll-my-24 min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
          />
        </div>
      </div>

      <CheckGroup
        legend={GROUP.dietLegend[locale]}
        name={`d${index}`}
        idPrefix={`${id}-diet`}
        options={DIET_KEYS.map((key) => ({ value: key, label: DIET_SHORT_LABEL[key][locale] }))}
        selected={person.diet}
        onToggle={(value, on) => onChange({ diet: toggleKey<DietKey>(person.diet, value as DietKey, on, DIET_KEYS) })}
      />
      <CheckGroup
        legend={GROUP.avoidLegend[locale]}
        name={`a${index}`}
        idPrefix={`${id}-avoid`}
        options={AVOID_KEYS.map((key) => ({ value: key, label: AVOID_LABEL[key][locale] }))}
        selected={person.avoid}
        onToggle={(value, on) => onChange({ avoid: toggleKey<AvoidKey>(person.avoid, value as AvoidKey, on, AVOID_KEYS) })}
      />

      {canRemove ? (
        <div>
          <Button
            type="submit"
            name="act"
            value={`remove-${index}`}
            variant="secondary"
            size="sm"
            className="scroll-my-24"
            onClick={(event) => {
              event.preventDefault();
              onRemove();
            }}
          >
            {GROUP.remove[locale]}
            <span className="visually-hidden">{` ${legend}`}</span>
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}

interface CheckGroupProps {
  legend: string;
  name: string;
  idPrefix: string;
  options: { value: string; label: string }[];
  selected: readonly string[];
  onToggle: (value: string, on: boolean) => void;
}

function CheckGroup({ legend, name, idPrefix, options, selected, onToggle }: CheckGroupProps) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[var(--space-2)] text-lg font-semibold text-ink-900">{legend}</legend>
      <div className="flex flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-[var(--space-2)]">
            <input
              type="checkbox"
              id={`${idPrefix}-${option.value}`}
              name={name}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={(event) => onToggle(option.value, event.target.checked)}
              className="h-[1.25rem] w-[1.25rem] scroll-my-24"
            />
            <label htmlFor={`${idPrefix}-${option.value}`} className="text-base text-ink-900">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function ShareBox({ locale, value, hydrated }: { locale: Locale; value: string; hydrated: boolean }) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(GROUP.copied[locale]);
    } catch {
      setMessage(GROUP.copyFailed[locale]);
    }
  }

  return (
    <section aria-labelledby="share" className="flex flex-col gap-[var(--space-2)] rounded-panel bg-welfare-soft p-[var(--space-4)]">
      <Heading level={2} id="share" className="m-0 text-xl">
        {GROUP.shareTitle[locale]}
      </Heading>
      <p className="m-0 text-sm text-ink-600">{GROUP.shareHint[locale]}</p>
      <div className="flex flex-wrap items-end gap-[var(--space-2)]">
        <div className="flex min-w-0 flex-1 basis-[16rem] flex-col gap-[var(--space-1)]">
          <label htmlFor="group-share-url" className="text-base font-medium text-ink-900">
            {GROUP.shareLabel[locale]}
          </label>
          <input
            id="group-share-url"
            type="text"
            readOnly
            value={value}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-[var(--target-min)] w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
          />
        </div>
        {hydrated ? (
          <Button type="button" variant="secondary" onClick={copy}>
            {GROUP.copy[locale]}
          </Button>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="m-0 text-base text-ink-900 empty:hidden">
        {message}
      </p>
    </section>
  );
}
