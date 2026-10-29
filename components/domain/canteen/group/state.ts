/**
 * Eat as a group: the pure helpers shared by the server page and the client
 * builder, so the no-JavaScript form and the instant client agree on every URL.
 *
 * Two shapes of URL exist:
 *
 * 1. The CANONICAL URL: `?p=Mint.50.np-v.s1~Ben.80..s3&strat=own&seed=k7m2qx&r=1-0`.
 *    The whole group lives in `p` (see lib/canteen/group.ts). `strat` is
 *    `one` (default, left off), `own` or `random`. `seed` makes the picks
 *    reproducible. `r` holds each person's reroll count, joined with `-`.
 * 2. The FORM URL a plain GET submit of the builder produces: one set of
 *    fields per person (`n0` name, `max0` budget, `d0` diet (repeated),
 *    `a0` avoid (repeated)) plus
 *    `strat`, `seed` and `act` (`show`, `add` or `remove-2`). The server turns
 *    it into the canonical URL with a redirect.
 *
 * No server storage and no em dashes. Names are cleaned and capped by
 * `cleanName` from lib/canteen/group.ts.
 */

import {
  AVOID_KEYS,
  DIET_KEYS,
  MAX_BUDGET,
  type AvoidKey,
  type DietKey,
  type RawParams,
} from "@/lib/canteen/params";
import {
  MAX_PEOPLE,
  cleanName,
  decodeGroup,
  encodeGroup,
  type GroupChange,
  type Person,
} from "@/lib/canteen/group";

export type Strategy = "one" | "own" | "random";
export const STRATEGIES: readonly Strategy[] = ["one", "own", "random"];

export const MAX_REROLLS = 99;

export interface GroupState {
  people: Person[];
  strategy: Strategy;
  /** Only meaningful for `own` and `random`. */
  seed?: string;
  /** Reroll count by person index. Always the same length as `people` or shorter. */
  rerolls: number[];
}

/** A person with nothing filled in. */
export function blankPerson(): Person {
  return { name: "", diet: [], avoid: [] };
}

function firstValue(raw: RawParams, name: string): string | undefined {
  const value = raw instanceof URLSearchParams ? raw.get(name) : raw[name];
  const single = Array.isArray(value) ? value[0] : value;
  return single ?? undefined;
}

function allValues(raw: RawParams, name: string): string[] {
  if (raw instanceof URLSearchParams) return raw.getAll(name);
  const value = raw[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** A seed is short letters and digits. Anything else is dropped, so a hand edited URL cannot inject text. */
export function cleanSeed(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return /^[a-zA-Z0-9]{1,16}$/.test(raw) ? raw : undefined;
}

/** `1-0-2` to [1, 0, 2]. Bad pieces become 0, counts are capped, at most eight. */
export function parseRerolls(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split("-")
    .slice(0, MAX_PEOPLE)
    .map((piece) => (/^\d{1,3}$/.test(piece) ? Math.min(Number(piece), MAX_REROLLS) : 0));
}

/** [1, 0, 2] to "1-0-2". All zeros gives "" (nothing to say). */
export function encodeRerolls(rerolls: readonly number[]): string {
  const trimmed = [...rerolls];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1]) trimmed.pop();
  return trimmed.join("-");
}

export function parseStrategy(raw: string | undefined): Strategy {
  return STRATEGIES.find((strategy) => strategy === raw) ?? "one";
}

/** The group state out of canonical URL parameters. Never throws. */
export function readGroupState(raw: RawParams): GroupState {
  const people = decodeGroup(firstValue(raw, "p"));
  return {
    people,
    strategy: parseStrategy(firstValue(raw, "strat")),
    seed: cleanSeed(firstValue(raw, "seed")),
    rerolls: parseRerolls(firstValue(raw, "r")).slice(0, people.length),
  };
}

/** The canonical query string, without the leading `?`. Defaults are left out. */
export function groupQuery(state: Pick<GroupState, "people" | "strategy"> & Partial<GroupState>): string {
  const parts: string[] = [];
  const encoded = encodeGroup(state.people);
  // encodeURIComponent keeps `~`, `.` and `-` readable, which is what makes the link compact.
  if (encoded) parts.push(`p=${encodeURIComponent(encoded)}`);
  if (state.strategy !== "one") parts.push(`strat=${state.strategy}`);
  const seed = cleanSeed(state.seed);
  if (seed && state.strategy !== "one") parts.push(`seed=${seed}`);
  const rerolls = encodeRerolls(state.rerolls ?? []);
  if (rerolls && state.strategy !== "one") parts.push(`r=${rerolls}`);
  return parts.join("&");
}

/** What tells one group from another: the people, as the link carries them. */
export function encodeGroupKey(state: Pick<GroupState, "people">): string {
  return encodeGroup(state.people);
}

/** A path with the canonical query and an optional fragment. The path may carry a query of its own, such as `?mode=group`. */
export function groupHref(
  path: string,
  state: Pick<GroupState, "people" | "strategy"> & Partial<GroupState>,
  hash?: string,
): string {
  const query = groupQuery(state);
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${query ? `${joiner}${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/* ------------------------------------------------------------------ *
 * The form
 * ------------------------------------------------------------------ */

export type GroupAction = { kind: "show" } | { kind: "add" } | { kind: "remove"; index: number };

/** True when the request is a submitted builder form rather than a canonical URL. */
export function isFormSubmission(raw: RawParams): boolean {
  const names = raw instanceof URLSearchParams ? [...raw.keys()] : Object.keys(raw);
  return names.some((name) => name === "act" || /^n\d+$/.test(name));
}

function parseAction(raw: string | undefined): GroupAction {
  if (raw === "add") return { kind: "add" };
  const match = raw ? /^remove-(\d)$/.exec(raw) : null;
  if (match) return { kind: "remove", index: Number(match[1]) };
  return { kind: "show" };
}

function parseBudget(raw: string | undefined): number | undefined {
  const text = raw?.trim();
  if (!text || !/^\d{1,5}$/.test(text)) return undefined;
  const value = Number(text);
  return value >= 1 && value <= MAX_BUDGET ? value : undefined;
}

/** The people the form fields describe, in field order, at most eight. Unknown values are dropped. */
export function peopleFromForm(raw: RawParams): Person[] {
  const names = raw instanceof URLSearchParams ? [...raw.keys()] : Object.keys(raw);
  const indexes = [
    ...new Set(
      names
        .map((name) => /^(?:n|max|d|a)(\d+)$/.exec(name)?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number)
        .filter((index) => index < MAX_PEOPLE * 2),
    ),
  ].sort((a, b) => a - b);

  return indexes.slice(0, MAX_PEOPLE).map((index) => {
    const person: Person = {
      name: cleanName(firstValue(raw, `n${index}`) ?? ""),
      diet: DIET_KEYS.filter((key) => allValues(raw, `d${index}`).includes(key)),
      avoid: AVOID_KEYS.filter((key) => allValues(raw, `a${index}`).includes(key)),
    };
    const max = parseBudget(firstValue(raw, `max${index}`));
    if (max !== undefined) person.max = max;
    return person;
  });
}

/** Applies the form's action to the people it describes. Removing the only person leaves one blank person. */
export function applyAction(people: readonly Person[], action: GroupAction): Person[] {
  if (action.kind === "add") return people.length >= MAX_PEOPLE ? [...people] : [...people, blankPerson()];
  if (action.kind === "remove") {
    const next = people.filter((_, index) => index !== action.index);
    return next.length > 0 ? next : [blankPerson()];
  }
  return [...people];
}

/**
 * What a submitted form turns into: the canonical state, and the fragment to
 * land on (the new person after "Add", the builder after "Remove", the
 * results after "Show results").
 */
export function stateFromForm(raw: RawParams): { state: GroupState; hash: string } {
  const action = parseAction(firstValue(raw, "act"));
  const people = applyAction(peopleFromForm(raw), action);
  const state: GroupState = {
    people,
    strategy: parseStrategy(firstValue(raw, "strat")),
    seed: cleanSeed(firstValue(raw, "seed")),
    // Editing the group makes old reroll counts meaningless, so they start again.
    rerolls: [],
  };
  const hash =
    action.kind === "add"
      ? `person-${people.length}`
      : action.kind === "remove"
        ? "builder"
        : "results";
  return { state, hash };
}

/* ------------------------------------------------------------------ *
 * Small helpers for the views
 * ------------------------------------------------------------------ */

/** Toggles one value in a sorted option list. */
export function toggleKey<T extends DietKey | AvoidKey>(list: readonly T[], key: T, on: boolean, order: readonly T[]): T[] {
  const set = new Set(list);
  if (on) set.add(key);
  else set.delete(key);
  return order.filter((option) => set.has(option));
}

/** The person after applying a suggested change. */
export function applyChange(person: Person, change: GroupChange): Person {
  switch (change.kind) {
    case "raiseBudget":
      return { ...person, max: change.to };
    case "dropDiet":
      return { ...person, diet: person.diet.filter((key) => key !== change.value) };
    case "dropAvoid":
      return { ...person, avoid: person.avoid.filter((key) => key !== change.value) };
  }
}

/** The name a person goes by: what they typed, or "Person 2". */
export function personLabel(person: Person, index: number, personWord: (n: number) => string): string {
  return person.name || personWord(index + 1);
}

/** One short mark for a person on the plan: the first character (emoji kept whole), or the person number. */
export function personBadge(person: Person, index: number): string {
  const name = person.name.trim();
  if (!name) return String(index + 1);
  const first =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(name)[Symbol.iterator]().next().value?.segment
      : [...name][0];
  return (first ?? String(index + 1)).toUpperCase();
}

/** Returns a copy with the nth reroll count raised by one, capped. */
export function bumpReroll(rerolls: readonly number[], index: number, people: number): number[] {
  const next = Array.from({ length: people }, (_, i) => rerolls[i] ?? 0);
  next[index] = Math.min((next[index] ?? 0) + 1, MAX_REROLLS);
  return next;
}
