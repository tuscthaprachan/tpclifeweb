/**
 * Pure helpers for "Decide for me": reading the pick parameters out of a URL,
 * building links back to the same page, choosing one meal combo, and the
 * "why it matched" parts. No React, so the server page, the client island and
 * the unit tests all run the same code.
 *
 * WHERE THE RANDOMNESS COMES FROM. Everything is seeded: the same URL gives
 * the same result. The server cannot see the device (history, favourites,
 * dislikes live in localStorage), so the server render uses bias `fair` or
 * `cheap` and no history. The client island may re-run `pick()` with the
 * device data and replace the result; see `Randomiser.tsx`.
 */

import { activeChips, type StallNamer } from "../chips";
import { eatHref } from "../links";
import { BIASES, createRng, type Bias, type LockKey, type PickLock } from "@/lib/canteen/random";
import type { MealCombo } from "@/lib/canteen/combos";
import type { CanteenFilters, RawParams } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";

export const PICK_ROUTE = "/eat/pick";

export type PickMode = "dish" | "meal" | "stall";
export const PICK_MODES: readonly PickMode[] = ["dish", "meal", "stall"];
export const LOCK_KEYS: readonly LockKey[] = ["stall", "type", "canonical"];

/** How many vetoed slugs a link may carry. A hand edited URL cannot grow without limit. */
export const MAX_VETOES = 60;

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SEED = /^[a-z0-9]{1,24}$/;

export interface PickParams {
  /** Absent means "make one and redirect". */
  seed?: string;
  mode: PickMode;
  bias: Bias;
  /** Dimensions kept from the previous dish. Only meaningful with `of`. */
  lock: LockKey[];
  /** Slug of the previous dish the locks are relative to. */
  of?: string;
  /** Vetoed dish slugs. */
  not: string[];
  /** Meal mode only: drink and dessert come from the main's stall (`same=1`). */
  sameStall: boolean;
}

function all(raw: RawParams, name: string): string[] {
  const values = raw instanceof URLSearchParams ? raw.getAll(name) : [raw[name]].flat().filter((v): v is string => v !== undefined);
  return values
    .flatMap((value) => value.split(","))
    .map((token) => token.trim())
    .filter(Boolean);
}

/** Reads seed, mode, bias, lock, of and not. Anything invalid is dropped. Never throws. */
export function readPickParams(raw: RawParams): PickParams {
  const seed = all(raw, "seed")[0]?.toLowerCase();
  const mode = all(raw, "mode")[0];
  const bias = all(raw, "bias")[0];
  const sameStall = all(raw, "same")[0] === "1";
  const of = all(raw, "of")[0];
  const lockTokens = new Set(all(raw, "lock"));
  const not = [...new Set(all(raw, "not").filter((slug) => SLUG.test(slug)))].slice(0, MAX_VETOES);

  const lock = LOCK_KEYS.filter((key) => lockTokens.has(key));
  const validOf = of !== undefined && SLUG.test(of) ? of : undefined;

  return {
    ...(seed !== undefined && SEED.test(seed) ? { seed } : {}),
    mode: PICK_MODES.find((item) => item === mode) ?? "dish",
    bias: BIASES.find((item) => item === bias) ?? "fair",
    lock: validOf ? lock : [],
    ...(validOf ? { of: validOf } : {}),
    not,
    sameStall,
  };
}

/** Whether a bias needs what only the device knows. */
export function biasNeedsDevice(bias: Bias): boolean {
  return bias === "new" || bias === "usual";
}

/** The bias the server can honour: it has no history or favourites, so `new` and `usual` fall back to `fair`. */
export function serverBias(bias: Bias): Bias {
  return biasNeedsDevice(bias) ? "fair" : bias;
}

/** The lock `pick()` takes, or undefined when there is nothing to keep. */
export function toPickLock(params: Pick<PickParams, "lock" | "of">): PickLock | undefined {
  if (!params.of || params.lock.length === 0) return undefined;
  return {
    of: params.of,
    ...(params.lock.includes("stall") ? { stall: true } : {}),
    ...(params.lock.includes("type") ? { type: true } : {}),
    ...(params.lock.includes("canonical") ? { canonical: true } : {}),
  };
}

type Extras = Record<string, string | undefined>;

/**
 * The non filter parameters of a pick link. Defaults (mode dish, bias fair)
 * are left out so URLs stay short and equal picks have equal URLs.
 */
export function pickExtras(params: PickParams, change: Partial<PickParams> = {}): Extras {
  const next: PickParams = { ...params, ...change };
  const lock = next.of ? next.lock : [];
  return {
    seed: next.seed,
    mode: next.mode === "dish" ? undefined : next.mode,
    bias: next.bias === "fair" ? undefined : next.bias,
    lock: lock.length > 0 ? lock.join(",") : undefined,
    of: lock.length > 0 ? next.of : undefined,
    not: next.not.length > 0 ? next.not.slice(0, MAX_VETOES).join(",") : undefined,
    same: next.sameStall ? "1" : undefined,
  };
}

/** A link to this page with the filters and the given pick parameters. */
export function pickHref(locale: Locale, filters: CanteenFilters, params: PickParams, change: Partial<PickParams> = {}): string {
  return eatHref(locale, PICK_ROUTE, filters, pickExtras(params, change));
}

/**
 * One meal combo from the best few, chosen by the seed. `not` removes any
 * combo containing a vetoed dish; if that leaves nothing the vetoes are
 * dropped (and `vetoRelaxed` says so) rather than showing an empty page.
 */
export function chooseCombo(
  combos: readonly MealCombo[],
  seed: string,
  not: readonly string[],
  top = 10,
): { combo: MealCombo | null; vetoRelaxed: boolean } {
  if (combos.length === 0) return { combo: null, vetoRelaxed: false };
  const vetoed = new Set(not);
  const free = combos.filter((combo) => !combo.items.some((dish) => vetoed.has(dish.slug.current)));
  const pool = (free.length > 0 ? free : combos).slice(0, Math.max(1, top));
  const combo = pool[Math.floor(createRng(seed)() * pool.length)] ?? null;
  return { combo, vetoRelaxed: free.length === 0 && not.length > 0 };
}

/** Up to `max` names for the reel, in a seeded order, always ending on `final`. */
export function reelNames(names: readonly string[], final: string, seed: string, max = 12): string[] {
  const unique = [...new Set(names)].filter((name) => name !== final);
  const rng = createRng(`reel-${seed}`);
  for (let i = unique.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [unique[i], unique[j]] = [unique[j]!, unique[i]!];
  }
  return [...unique.slice(0, Math.max(0, max - 1)), final];
}

/** The active filters as plain labels, for the "why it matched" line. */
export function filterLabels(filters: CanteenFilters, locale: Locale, stallName?: StallNamer): string[] {
  return activeChips(filters, locale, stallName).map((chip) => chip.label);
}

/** Joins labels the way the language reads a list. */
export function joinLabels(labels: readonly string[], locale: Locale): string {
  return labels.join(locale === "th" ? " " : ", ");
}
