/**
 * Eat as a group. No server state: the people live in one URL parameter, `p`.
 *
 * ENCODING (`p`)
 * People are joined with `~`. Each person is five fields joined with `.`:
 *
 *     name . max . diet . spice . avoid
 *
 * - `name`: free text. The characters `\`, `.` and `~` are escaped with a
 *   backslash, nothing else is, so Thai names and emoji stay readable.
 * - `max`: the budget in whole baht, or empty.
 * - `diet`: codes joined with `-`: np (no pork), h (halal), c (certified
 *   halal), v (vegetarian), vg (vegan), j (jay).
 * - `spice`: `s` and a digit 0 to 3, the highest spice accepted, or empty.
 * - `avoid`: codes joined with `-`: pk (pork), bf (beef), sf (seafood),
 *   fi (fish), eg (egg).
 *
 * Trailing empty fields are left off, so `Mint.50.np-v.s1~Ben.80..s3` is two
 * people. At most eight people, names at most 24 characters. Decoding never
 * throws: unknown codes and bad numbers are dropped, extra people ignored.
 *
 * All of it pure, so the no-JavaScript form and the client agree.
 */

import type { CanteenData, CanteenDish, CanteenSeatingZone, CanteenStall } from "@/lib/sanity/types";

import { effectivePrice, indexCanteen } from "./derive";
import { isMealDish, matchesFilters } from "./filter";
import {
  AVOID_KEYS,
  DIET_KEYS,
  defaultFilters,
  type AvoidKey,
  type CanteenFilters,
  type DietKey,
} from "./params";
import { pick, type Bias } from "./random";

/** One person in the group. */
export interface Person {
  /** A name or an emoji. May be empty; the UI then says "Person 2". */
  name: string;
  /** Budget in baht. */
  max?: number;
  diet: DietKey[];
  avoid: AvoidKey[];
  /** Highest spice accepted, 0 to 3 (3 means any). */
  spice?: 0 | 1 | 2 | 3;
}

export const MAX_PEOPLE = 8;
export const MAX_NAME_LENGTH = 24;

const DIET_CODES: Record<DietKey, string> = {
  nopork: "np",
  halal: "h",
  certified: "c",
  vegetarian: "v",
  vegan: "vg",
  jay: "j",
};
const AVOID_CODES: Record<AvoidKey, string> = { pork: "pk", beef: "bf", seafood: "sf", fish: "fi", egg: "eg" };

function escapeName(name: string): string {
  return name.replace(/[\\.~]/g, (char) => `\\${char}`);
}

/** Splits on an unescaped delimiter, keeping escapes in the pieces. */
function splitUnescaped(text: string, delimiter: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (char === "\\" && i + 1 < text.length) {
      current += char + text[i + 1];
      i += 1;
    } else if (char === delimiter) {
      pieces.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  pieces.push(current);
  return pieces;
}

function unescapeName(text: string): string {
  return text.replace(/\\(.)/g, "$1");
}

/** Cleans a name the way both encode and decode need: no control characters, trimmed, capped. */
export function cleanName(name: string): string {
  return [...name.replace(/[\u0000-\u001f\u007f]/g, " ").trim()].slice(0, MAX_NAME_LENGTH).join("").trim();
}

/** Encodes people for the `p` parameter. See the file comment for the format. Empty input gives "". */
export function encodeGroup(people: readonly Person[]): string {
  return people
    .slice(0, MAX_PEOPLE)
    .map((person) => {
      const diet = DIET_KEYS.filter((key) => person.diet.includes(key)).map((key) => DIET_CODES[key]);
      const avoid = AVOID_KEYS.filter((key) => person.avoid.includes(key)).map((key) => AVOID_CODES[key]);
      const fields = [
        escapeName(cleanName(person.name)),
        person.max !== undefined ? String(person.max) : "",
        diet.join("-"),
        person.spice !== undefined ? `s${person.spice}` : "",
        avoid.join("-"),
      ];
      while (fields.length > 1 && fields[fields.length - 1] === "") fields.pop();
      // A person with no name and nothing set still has to be a person, so it is written as ".".
      return fields.length === 1 && fields[0] === "" ? "." : fields.join(".");
    })
    .join("~");
}

/** Decodes the `p` parameter. Never throws. Returns [] for anything unusable. */
export function decodeGroup(encoded: string | null | undefined): Person[] {
  if (!encoded) return [];
  const people: Person[] = [];
  // An empty chunk (a stray or doubled "~") is not a person. A person with nothing set is ".".
  const chunks = splitUnescaped(encoded, "~").filter((chunk) => chunk !== "");
  for (const chunk of chunks.slice(0, MAX_PEOPLE)) {
    const [name = "", max = "", diet = "", spice = "", avoid = ""] = splitUnescaped(chunk, ".");
    const person: Person = {
      name: cleanName(unescapeName(name)),
      diet: [],
      avoid: [],
    };
    if (/^\d{1,5}$/.test(max) && Number(max) >= 1) person.max = Number(max);
    const dietCodes = new Set(diet.split("-"));
    person.diet = DIET_KEYS.filter((key) => dietCodes.has(DIET_CODES[key]));
    if (/^s[0-3]$/.test(spice)) person.spice = Number(spice[1]) as 0 | 1 | 2 | 3;
    const avoidCodes = new Set(avoid.split("-"));
    person.avoid = AVOID_KEYS.filter((key) => avoidCodes.has(AVOID_CODES[key]));
    people.push(person);
  }
  return people;
}

/** Reads `p` from URL parameters the way Next gives them. */
export function groupFromParams(
  raw: Record<string, string | string[] | undefined> | URLSearchParams,
): Person[] {
  const value = raw instanceof URLSearchParams ? raw.get("p") : raw.p;
  return decodeGroup(Array.isArray(value) ? value[0] : value);
}

/* ------------------------------------------------------------------ *
 * Per-person filters
 * ------------------------------------------------------------------ */

/**
 * The filters one person's dishes must pass: the shared `base` filters (for
 * example a type or a stall everyone agreed on) plus the person's own budget,
 * diet, avoid and spice. The tighter budget and spice win; diet and avoid are
 * unioned.
 */
export function personFilters(person: Person, base: CanteenFilters = defaultFilters()): CanteenFilters {
  const max =
    person.max !== undefined && base.max !== undefined ? Math.min(person.max, base.max) : (person.max ?? base.max);
  const personSpice = person.spice !== undefined && person.spice < 3 ? (person.spice as 0 | 1 | 2) : undefined;
  const spice =
    personSpice !== undefined && base.spice !== undefined ? (Math.min(personSpice, base.spice) as 0 | 1 | 2) : (personSpice ?? base.spice);
  return {
    ...base,
    max,
    spice,
    diet: DIET_KEYS.filter((key) => base.diet.includes(key) || person.diet.includes(key)),
    avoid: AVOID_KEYS.filter((key) => base.avoid.includes(key) || person.avoid.includes(key)),
  };
}

export interface GroupOptions {
  now: Date;
  /** Filters shared by everyone. Defaults to none. */
  base?: CanteenFilters;
}

/** Meal dishes (see `isMealDish`) at each stall that suit one person, keyed by stall id. */
function dishesByStallFor(data: CanteenData, filters: CanteenFilters, now: Date): Map<string, CanteenDish[]> {
  const map = new Map<string, CanteenDish[]>();
  for (const dish of data.dishes) {
    if (!isMealDish(dish, filters) || !matchesFilters(data, dish, filters, now)) continue;
    const list = map.get(dish.stall._ref);
    if (list) list.push(dish);
    else map.set(dish.stall._ref, [dish]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.price - b.price || a.slug.current.localeCompare(b.slug.current));
  }
  return map;
}

/* ------------------------------------------------------------------ *
 * Strategy 1: one stall for everyone
 * ------------------------------------------------------------------ */

/** A stall where everyone has at least one dish they can have. */
export interface SharedStall {
  stall: CanteenStall;
  /** Same order as the people passed in. Each list is never empty. */
  perPerson: CanteenDish[][];
  /** The fewest options anyone has here: how well the most constrained person is served. */
  minChoices: number;
}

/**
 * Stalls where every person has at least one matching dish, best first.
 * "Best" is the stall where the most constrained person has the most choices,
 * then the most choices overall, then walking order.
 */
export function oneStallForAll(data: CanteenData, people: readonly Person[], options: GroupOptions): SharedStall[] {
  if (people.length === 0) return [];
  const { walkRank } = indexCanteen(data);
  const perPersonMaps = people.map((person) =>
    dishesByStallFor(data, personFilters(person, options.base), options.now),
  );

  const shared: SharedStall[] = [];
  for (const stall of data.stalls) {
    const perPerson = perPersonMaps.map((map) => map.get(stall._id) ?? []);
    if (perPerson.some((list) => list.length === 0)) continue;
    shared.push({ stall, perPerson, minChoices: Math.min(...perPerson.map((list) => list.length)) });
  }

  const total = (entry: SharedStall) => entry.perPerson.reduce((sum, list) => sum + list.length, 0);
  return shared.sort(
    (a, b) =>
      b.minChoices - a.minChoices ||
      total(b) - total(a) ||
      (walkRank.get(a.stall._id) ?? 0) - (walkRank.get(b.stall._id) ?? 0),
  );
}

/* ------------------------------------------------------------------ *
 * Strategy 2 and 3: everyone their own, sit together; random for all
 * ------------------------------------------------------------------ */

export interface OwnPicksOptions extends GroupOptions {
  seed: string;
  /** How many times each person has rerolled, by person index. Changes only that person's pick. */
  rerolls?: Readonly<Record<number, number>>;
  bias?: Bias;
}

/** One person's pick. `dish` is null when nothing suits them. */
export interface PersonPick {
  personIndex: number;
  dish: CanteenDish | null;
  stall: CanteenStall | null;
}

export interface SeatingChoice {
  zone: CanteenSeatingZone;
  /** Distance in grid cells, from the middle of the zone to the middle of the picked stalls. */
  distance: number;
}

export interface OwnPicks {
  picks: PersonPick[];
  /** The seating zone nearest the stalls picked. Null when there are no zones or no picks. */
  seating: SeatingChoice | null;
}

/** The seed used for one person's pick, so a reroll changes only that person. */
export function personSeed(seed: string, personIndex: number, rerolls?: Readonly<Record<number, number>>): string {
  return `${seed}/${personIndex}/${rerolls?.[personIndex] ?? 0}`;
}

function centre(cell: { col: number; row: number; w: number; h: number }): { x: number; y: number } {
  return { x: cell.col + cell.w / 2, y: cell.row + cell.h / 2 };
}

/**
 * Everyone gets their own seeded pick (fair across stalls), and the group is
 * pointed at the seating zone nearest the picked stalls (Manhattan distance
 * from the average of the stalls' centres). This is also "random for all":
 * rerolling one person is `rerolls[index] + 1` and leaves the others alone.
 */
export function eachTheirOwn(data: CanteenData, people: readonly Person[], options: OwnPicksOptions): OwnPicks {
  const picks: PersonPick[] = people.map((person, personIndex) => {
    const result = pick(data, personFilters(person, options.base), {
      seed: personSeed(options.seed, personIndex, options.rerolls),
      bias: options.bias ?? "fair",
      now: options.now,
    });
    return { personIndex, dish: result.dish, stall: result.stall };
  });

  const stalls = picks.map((entry) => entry.stall).filter((stall): stall is CanteenStall => stall !== null);
  const zones = data.settings?.seatingZones ?? [];
  if (stalls.length === 0 || zones.length === 0) return { picks, seating: null };

  const centres = stalls.map((stall) => centre(stall.mapCell));
  const mean = {
    x: centres.reduce((sum, c) => sum + c.x, 0) / centres.length,
    y: centres.reduce((sum, c) => sum + c.y, 0) / centres.length,
  };
  let nearest: SeatingChoice | null = null;
  for (const zone of zones) {
    const c = centre(zone);
    const distance = Math.abs(c.x - mean.x) + Math.abs(c.y - mean.y);
    if (!nearest || distance < nearest.distance) nearest = { zone, distance };
  }
  return { picks, seating: nearest };
}

/* ------------------------------------------------------------------ *
 * Binding constraint
 * ------------------------------------------------------------------ */

/** The smallest change to one person's settings that gives them a dish at a stall. */
export type GroupChange =
  | { kind: "raiseBudget"; to: number }
  | { kind: "dropDiet"; value: DietKey }
  | { kind: "dropAvoid"; value: AvoidKey }
  | { kind: "raiseSpice"; to: 1 | 2 | 3 };

/** A person who has nothing at the stall, and what would fix it (null if nothing small would). */
export interface Blocker {
  personIndex: number;
  change: GroupChange | null;
}

export interface BindingConstraint {
  /** The stall closest to working for everyone. */
  stall: CanteenStall;
  /** Who has no dish there, the most constrained person first. */
  blockers: Blocker[];
}

function smallestChange(
  data: CanteenData,
  person: Person,
  base: CanteenFilters | undefined,
  stall: CanteenStall,
  now: Date,
): GroupChange | null {
  const filters = personFilters(person, base);
  const atStall = data.dishes.filter((dish) => dish.stall._ref === stall._id && isMealDish(dish, filters));
  const fits = (changed: CanteenFilters) => atStall.some((dish) => matchesFilters(data, dish, changed, now));

  // A budget change is the gentlest: the cheapest dish that otherwise fits.
  if (filters.max !== undefined) {
    const unbudgeted = { ...filters, max: undefined };
    const prices = atStall
      .filter((dish) => matchesFilters(data, dish, unbudgeted, now))
      .map((dish) => effectivePrice(dish, filters.variants));
    if (prices.length > 0) {
      const needed = Math.min(...prices);
      return { kind: "raiseBudget", to: needed };
    }
  }
  for (const value of filters.diet) {
    if (fits({ ...filters, diet: filters.diet.filter((entry) => entry !== value) })) return { kind: "dropDiet", value };
  }
  for (const value of filters.avoid) {
    if (fits({ ...filters, avoid: filters.avoid.filter((entry) => entry !== value) })) return { kind: "dropAvoid", value };
  }
  if (filters.spice !== undefined) {
    for (const level of [1, 2, 3] as const) {
      if (level > filters.spice && fits({ ...filters, spice: level === 3 ? undefined : level })) {
        return { kind: "raiseSpice", to: level };
      }
    }
  }
  return null;
}

/**
 * When no stall suits everyone: the stall that comes closest, who has nothing
 * there, and for each of them the smallest change that would unlock it
 * ("If Mint's budget went to 55, stall 4 works for everyone"). Returns null
 * when some stall already works for the whole group (or the group is empty).
 *
 * The stall is chosen so that, if possible, every blocker has a fix; then by
 * fewest blockers; then walking order.
 */
export function bindingConstraint(
  data: CanteenData,
  people: readonly Person[],
  options: GroupOptions,
): BindingConstraint | null {
  if (people.length === 0 || data.stalls.length === 0) return null;
  if (oneStallForAll(data, people, options).length > 0) return null;

  const { walkRank } = indexCanteen(data);
  const perPersonMaps = people.map((person) =>
    dishesByStallFor(data, personFilters(person, options.base), options.now),
  );
  const reachable = people.map((_, personIndex) =>
    data.stalls.filter((stall) => (perPersonMaps[personIndex]!.get(stall._id)?.length ?? 0) > 0).length,
  );

  // A stall with no dishes at all (a vacant slot) is not somewhere a group can eat, so it is never suggested.
  const stallsWithDishes = new Set(data.dishes.map((dish) => dish.stall._ref));
  const candidates = data.stalls.filter((stall) => stallsWithDishes.has(stall._id)).map((stall) => {
    const blockers: Blocker[] = [];
    people.forEach((person, personIndex) => {
      if ((perPersonMaps[personIndex]!.get(stall._id)?.length ?? 0) > 0) return;
      blockers.push({ personIndex, change: smallestChange(data, person, options.base, stall, options.now) });
    });
    blockers.sort((a, b) => reachable[a.personIndex]! - reachable[b.personIndex]! || a.personIndex - b.personIndex);
    return { stall, blockers };
  });

  candidates.sort((a, b) => {
    const aFixable = a.blockers.every((blocker) => blocker.change !== null) ? 0 : 1;
    const bFixable = b.blockers.every((blocker) => blocker.change !== null) ? 0 : 1;
    return (
      aFixable - bFixable ||
      a.blockers.length - b.blockers.length ||
      (walkRank.get(a.stall._id) ?? 0) - (walkRank.get(b.stall._id) ?? 0)
    );
  });

  const best = candidates[0];
  return best ? { stall: best.stall, blockers: best.blockers } : null;
}
