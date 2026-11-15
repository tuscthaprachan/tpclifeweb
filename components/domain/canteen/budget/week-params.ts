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
 *   skip.<d>   the dish a reroll of that day moved on from. The day gets a
 *              different dish whenever one fits.
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

/** Weekday to dish slug. */
export type Pins = Record<number, string>;

/**
 * What the request says about one weekday. `lock` and `keep` pin a dish; `free` leaves the day to the
 * planner and may name one dish to move off. A pinned day cannot also skip, so the union cannot say both.
 */
export type DayPin = { mode: "free"; skip?: string } | { mode: "keep" | "lock"; slug: string };

export interface WeekRequest {
  budget?: number;
  days: number[];
  seed?: string;
  /** Sparse: a weekday without an entry is `free`. */
  pins: Readonly<Record<number, DayPin>>;
}

function parseInt10(text: string | null | undefined, min: number, max: number): number | undefined {
  if (text === null || text === undefined || !/^\d{1,6}$/.test(text.trim())) return undefined;
  const value = Number(text.trim());
  return value >= min && value <= max ? value : undefined;
}

function slugParam(params: URLSearchParams, prefix: "lock" | "keep" | "skip", day: number): string | undefined {
  const slug = params.get(`${prefix}.${day}`);
  return slug && SLUG.test(slug) ? slug : undefined;
}

/** One weekday's pin from the URL. A lock beats a keep, a keep beats a skip, so a day is never two things. */
export function dayPinOf(params: URLSearchParams, day: number): DayPin | undefined {
  const lock = slugParam(params, "lock", day);
  if (lock) return { mode: "lock", slug: lock };
  const keep = slugParam(params, "keep", day);
  if (keep) return { mode: "keep", slug: keep };
  const skip = slugParam(params, "skip", day);
  return skip ? { mode: "free", skip } : undefined;
}

function pinsOf(params: URLSearchParams): Record<number, DayPin> {
  const out: Record<number, DayPin> = {};
  for (let day = 0; day <= 6; day += 1) {
    const pin = dayPinOf(params, day);
    if (pin) out[day] = pin;
  }
  return out;
}

/** What was typed into the budget when it is not a valid weekly budget (so the form can say so and keep it), or undefined. */
export function invalidWeekBudget(raw: RawParams): string | undefined {
  const params = toSearchParams(raw);
  const text = (params.get("budget") ?? params.get("weekBudget"))?.trim();
  return text && parseInt10(text, 1, MAX_WEEK_BUDGET) === undefined ? text : undefined;
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
  return { ...(budget !== undefined ? { budget } : {}), days, ...(seed ? { seed } : {}), pins: pinsOf(params) };
}

function slugsWhere(request: WeekRequest, pick: (pin: DayPin) => string | undefined): Pins {
  const out: Pins = {};
  for (const [day, pin] of Object.entries(request.pins)) {
    const slug = pick(pin);
    if (slug) out[Number(day)] = slug;
  }
  return out;
}

/** Locks and keeps together, for `planWeek`. Only days that are on campus matter to it. */
export function allPins(request: WeekRequest): Pins {
  return slugsWhere(request, (pin) => (pin.mode === "free" ? undefined : pin.slug));
}

/** The dishes a reroll moved days off, for `planWeek`. */
export function skippedDishes(request: WeekRequest): Pins {
  return slugsWhere(request, (pin) => (pin.mode === "free" ? pin.skip : undefined));
}

/** The query string (no leading `?`) for a request plus filters. Fixed order, so equal plans give equal links. */
export function weekQuery(request: WeekRequest, filters: CanteenFilters): string {
  const parts: string[] = ["mode=week"];
  const base = serialise(filters);
  if (base) parts.push(base);
  if (request.budget !== undefined) parts.push(`budget=${request.budget}`);
  parts.push(`days=${request.days.join(",")}`);
  if (request.seed) parts.push(`seed=${request.seed}`);
  for (const mode of ["lock", "keep", "skip"] as const) {
    for (let day = 0; day <= 6; day += 1) {
      const pin = request.pins[day];
      if (!pin) continue;
      const slug = pin.mode === "free" ? (mode === "skip" ? pin.skip : undefined) : pin.mode === mode ? pin.slug : undefined;
      if (slug) parts.push(`${mode}.${day}=${encodeURIComponent(slug)}`);
    }
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

function pinned(plan: readonly PinDay[], lockedDay?: number, except?: number): Record<number, DayPin> {
  const out: Record<number, DayPin> = {};
  for (const day of plan) {
    if (day.weekday === except) continue;
    out[day.weekday] = { mode: day.locked || day.weekday === lockedDay ? "lock" : "keep", slug: day.slug };
  }
  return out;
}

/** Pins `weekday` and keeps every other day as it is. */
export function lockDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  return { ...request, pins: pinned(plan, weekday) };
}

/** Turns a lock back into a keep, so the day stays put but is no longer shown as locked. */
export function unlockDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  return { ...request, pins: pinned(plan.map((day) => (day.weekday === weekday ? { ...day, locked: false } : day))) };
}

/** A new plan for one day: a new seed, every other day pinned as it is, and the day's current dish set aside. */
export function rerollDay(request: WeekRequest, plan: readonly PinDay[], weekday: number): WeekRequest {
  const pins = pinned(plan, undefined, weekday);
  const current = plan.find((day) => day.weekday === weekday)?.slug;
  if (current) pins[weekday] = { mode: "free", skip: current };
  return { ...request, seed: rerollSeed(request.seed ?? "", weekday), pins };
}

/** A new plan for every day that is not locked. */
export function rerollAll(request: WeekRequest, plan: readonly PinDay[]): WeekRequest {
  return { ...request, seed: rerollSeed(request.seed ?? "", 7), pins: pinned(plan.filter((day) => day.locked)) };
}

/** Drops every pin, keeping the seed. */
export function clearPins(request: WeekRequest): WeekRequest {
  return { ...request, pins: {} };
}
