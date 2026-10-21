/**
 * The URL scheme of the week mode of /eat/plan, and the pure moves on it (lock, unlock,
 * reroll one day). Plain module: safe from server and client.
 *
 *   /eat/plan?mode=week&budget=400&days=1,2,3,4,5&seed=k7m2qx&lock.2=slug&keep.4=slug&<filters>
 *
 *   mode       always `week`, which picks this planner on /eat/plan
 *   budget     weekly budget in baht (1 to 20000)
 *   days       weekdays on campus, 0 Sunday to 6 Saturday, comma separated.
 *              The form sends one `days` per ticked box plus an empty one,
 *              so "no day ticked" can be told from "not given" (default
 *              Monday to Friday).
 *   seed       the plan's seed. Same seed and same data give the same plan.
 *   lock.<d>   a day the student pinned on purpose. Shown as "Locked".
 *   keep.<d>   a day pinned only so that rerolling another day leaves it
 *              alone. Planned like a lock, shown as unlocked.
 *
 * Every link the page makes pins the whole plan that is on screen (locks and
 * keeps) except the day being rerolled, so only that day changes.
 */

import { serialise, type CanteenFilters, type RawParams } from "@/lib/canteen/params";
import { createRng, newSeed } from "@/lib/canteen/random";

import { toSearchParams } from "../query";

export const MAX_WEEK_BUDGET = 20000;
export const DEFAULT_DAYS: readonly number[] = [1, 2, 3, 4, 5];
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SEED = /^[a-z0-9]{1,24}$/;

export type Pins = Record<number, string>;

export interface WeekRequest {
  budget?: number;
  days: number[];
  seed?: string;
  locks: Pins;
  keeps: Pins;
}

function parseInt10(text: string | null | undefined, min: number, max: number): number | undefined {
  if (text === null || text === undefined || !/^\d{1,6}$/.test(text.trim())) return undefined;
  const value = Number(text.trim());
  return value >= min && value <= max ? value : undefined;
}

function pins(params: URLSearchParams, prefix: "lock" | "keep"): Pins {
  const out: Pins = {};
  for (let day = 0; day <= 6; day += 1) {
    const slug = params.get(`${prefix}.${day}`);
    if (slug && SLUG.test(slug)) out[day] = slug;
  }
  return out;
}

/** Reads the week parameters. Never throws; anything invalid is dropped. */
export function parseWeekRequest(raw: RawParams): WeekRequest {
  const params = toSearchParams(raw);
  const budgetText = params.get("budget") ?? params.get("weekBudget");
  const budget = parseInt10(budgetText, 1, MAX_WEEK_BUDGET);

  let days: number[];
  if (params.has("days")) {
    const picked = params
      .getAll("days")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => /^[0-6]$/.test(value))
      .map(Number);
    days = [...new Set(picked)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  } else {
    days = [...DEFAULT_DAYS];
  }

  const seedText = params.get("seed")?.toLowerCase();
  const seed = seedText && SEED.test(seedText) ? seedText : undefined;
  return { ...(budget !== undefined ? { budget } : {}), days, ...(seed ? { seed } : {}), locks: pins(params, "lock"), keeps: pins(params, "keep") };
}

/** Locks and keeps together, with locks winning, for `planWeek`. Only days that are on campus matter to it. */
export function allPins(request: WeekRequest): Pins {
  return { ...request.keeps, ...request.locks };
}

/** The query string (no leading `?`) for a request plus filters. Fixed order, so equal plans give equal links. */
export function weekQuery(request: WeekRequest, filters: CanteenFilters): string {
  const parts: string[] = ["mode=week"];
  const base = serialise(filters);
  if (base) parts.push(base);
  if (request.budget !== undefined) parts.push(`budget=${request.budget}`);
  parts.push(`days=${request.days.join(",")}`);
  if (request.seed) parts.push(`seed=${request.seed}`);
  for (let day = 0; day <= 6; day += 1) {
    const slug = request.locks[day];
    if (slug) parts.push(`lock.${day}=${encodeURIComponent(slug)}`);
  }
  for (let day = 0; day <= 6; day += 1) {
    const slug = request.keeps[day];
    if (slug && !request.locks[day]) parts.push(`keep.${day}=${encodeURIComponent(slug)}`);
  }
  return parts.join("&");
}

export function weekHref(path: string, request: WeekRequest, filters: CanteenFilters, hash?: string): string {
  const query = weekQuery(request, filters);
  return `${path}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/** The seed a reroll of one day moves to. Derived, so the same click always gives the same result. */
export function rerollSeed(seed: string, weekday: number): string {
  return newSeed(createRng(`${seed}:${weekday}`));
}

/** One planned day, as the moves need it. */
export interface PinDay {
  weekday: number;
  slug: string;
  locked: boolean;
}

/** Everything currently shown becomes pinned, locks staying locks and the rest becoming keeps. */
function pinnedState(plan: readonly PinDay[]): Pick<WeekRequest, "locks" | "keeps"> {
  const locks: Pins = {};
  const keeps: Pins = {};
  for (const day of plan) {
    if (day.locked) locks[day.weekday] = day.slug;
    else keeps[day.weekday] = day.slug;
  }
  return { locks, keeps };
}

export function lockDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  const { locks, keeps } = pinnedState(plan);
  const slug = plan.find((day) => day.weekday === weekday)?.slug;
  if (slug) {
    locks[weekday] = slug;
    delete keeps[weekday];
  }
  return { ...request, locks, keeps };
}

export function unlockDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  const { locks, keeps } = pinnedState(plan);
  const slug = locks[weekday];
  if (slug) {
    delete locks[weekday];
    keeps[weekday] = slug;
  }
  return { ...request, locks, keeps };
}

/** A new plan for one day: a new seed, every other day pinned as it is. */
export function rerollDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  const others = plan.filter((day) => day.weekday !== weekday);
  const { locks, keeps } = pinnedState(others);
  return { ...request, seed: rerollSeed(request.seed ?? "", weekday), locks, keeps };
}

/** A new plan for every day that is not locked. */
export function rerollAll(request: WeekRequest, plan: readonly PinDay[]): WeekRequest {
  const { locks } = pinnedState(plan);
  return { ...request, seed: rerollSeed(request.seed ?? "", 7), locks, keeps: {} };
}

/** Drops every pin, keeping the seed. */
export function clearPins(request: WeekRequest): WeekRequest {
  return { ...request, locks: {}, keeps: {} };
}
