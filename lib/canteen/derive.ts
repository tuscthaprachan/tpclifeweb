/**
 * Values derived from the canteen dataset: joins, diet flags, opening hours,
 * prices and medians. Computed in code and never stored, so there is no
 * second copy to drift out of date.
 *
 * Pure. Dates are read in Asia/Bangkok, the time zone every published time
 * on this site uses, whatever the server or the browser is set to.
 */

import { TIME_ZONE } from "@/lib/i18n/config";
import type {
  CampusPlace,
  CanonicalDish,
  CanteenData,
  CanteenDish,
  CanteenSettings,
  StallAddOn,
  CanteenStall,
  DishType,
  OpeningHours,
} from "@/lib/sanity/types";

import type { DietKey } from "./params";

/* ------------------------------------------------------------------ *
 * Empty and normalised data
 * ------------------------------------------------------------------ */

/** An empty but valid dataset. What every canteen page gets before any data exists. */
export function emptyCanteenData(): CanteenData {
  return { settings: null, stalls: [], dishes: [], canonicals: [] };
}

/**
 * Makes whatever the query returned safe to use. GROQ omits unset arrays and
 * returns null for a missing document, so this fills the gaps: missing lists
 * become empty lists, and a dish that points at a stall that does not exist
 * (or has no slug or a usable price) is dropped rather than crashing a page.
 */
export function normaliseCanteenData(raw: Partial<CanteenData> | null | undefined): CanteenData {
  if (!raw) return emptyCanteenData();

  const stalls = (raw.stalls ?? [])
    .filter((stall) => stall && stall.slug?.current && stall.mapCell)
    .map((stall) => ({ ...stall, cuisine: stall.cuisine ?? [] }));
  const stallIds = new Set(stalls.map((stall) => stall._id));

  const dishes = (raw.dishes ?? [])
    .filter(
      (dish) =>
        dish &&
        dish.slug?.current &&
        Number.isFinite(dish.price) &&
        dish.stall?._ref !== undefined &&
        stallIds.has(dish.stall._ref),
    )
    .map((dish) => ({
      ...dish,
      protein: dish.protein ?? [],
      variants: dish.variants ?? [],
    }));

  const settings: CanteenSettings | null = raw.settings
    ? {
        ...raw.settings,
        entrances: raw.settings.entrances ?? [],
        seatingZones: raw.settings.seatingZones ?? [],
        outline: raw.settings.outline ?? [],
        landmarks: raw.settings.landmarks ?? [],
      }
    : null;

  return {
    settings,
    stalls,
    dishes,
    canonicals: (raw.canonicals ?? []).filter((canonical) => canonical && canonical.slug?.current),
  };
}

/* ------------------------------------------------------------------ *
 * Joins and walking order
 * ------------------------------------------------------------------ */

/** Lookup tables over one dataset. Build with `indexCanteen`. */
export interface CanteenIndex {
  stallById: ReadonlyMap<string, CanteenStall>;
  stallBySlug: ReadonlyMap<string, CanteenStall>;
  canonicalById: ReadonlyMap<string, CanonicalDish>;
  canonicalBySlug: ReadonlyMap<string, CanonicalDish>;
  dishBySlug: ReadonlyMap<string, CanteenDish>;
  /** Stalls in walking order: by stall number, which follows the hall (west column, middle block, east column, north kiosks). */
  stallsInWalkOrder: readonly CanteenStall[];
  /** Position of each stall id in `stallsInWalkOrder`, from 0. */
  walkRank: ReadonlyMap<string, number>;
}

/**
 * Walking order comparison: by stall number, then name. The university's
 * numbering already follows the hall, so the floor plan position is not used.
 */
export function compareStallsByWalk(a: CanteenStall, b: CanteenStall): number {
  return (
    a.number - b.number ||
    a.name.en.localeCompare(b.name.en, "en") ||
    a.slug.current.localeCompare(b.slug.current)
  );
}

const indexCache = new WeakMap<CanteenData, CanteenIndex>();

/**
 * Builds (and caches per dataset object) the lookup tables the rest of
 * `lib/canteen` uses to join a dish to its stall and canonical dish. Cached
 * by object identity, so pass the same `CanteenData` value around rather
 * than copying it.
 */
export function indexCanteen(data: CanteenData): CanteenIndex {
  const cached = indexCache.get(data);
  if (cached) return cached;

  const stallsInWalkOrder = [...data.stalls].sort(compareStallsByWalk);
  const index: CanteenIndex = {
    stallById: new Map(data.stalls.map((stall) => [stall._id, stall])),
    stallBySlug: new Map(data.stalls.map((stall) => [stall.slug.current, stall])),
    canonicalById: new Map(data.canonicals.map((canonical) => [canonical._id, canonical])),
    canonicalBySlug: new Map(data.canonicals.map((canonical) => [canonical.slug.current, canonical])),
    dishBySlug: new Map(data.dishes.map((dish) => [dish.slug.current, dish])),
    stallsInWalkOrder,
    walkRank: new Map(stallsInWalkOrder.map((stall, position) => [stall._id, position])),
  };
  indexCache.set(data, index);
  return index;
}

/** The stall a dish is sold at, or undefined if the reference is dangling. */
export function stallOf(data: CanteenData, dish: CanteenDish): CanteenStall | undefined {
  return indexCanteen(data).stallById.get(dish.stall._ref);
}

/** The canonical dish a dish maps to, or undefined if it has none. */
export function canonicalOf(data: CanteenData, dish: CanteenDish): CanonicalDish | undefined {
  return dish.canonical ? indexCanteen(data).canonicalById.get(dish.canonical._ref) : undefined;
}

/* ------------------------------------------------------------------ *
 * Diet
 * ------------------------------------------------------------------ */

/**
 * True when the dish has no pork in its recorded proteins. This is what the
 * dish is tagged with, not a guarantee about the kitchen: broths, sauces and
 * shared woks are not tracked, and a halal stall is shown through its own
 * `halal` flag, not folded in here.
 */
export function noPork(dish: CanteenDish): boolean {
  return !dish.protein.includes("pork");
}

/** The stall's add-ons that go with this dish. */
export function addOnsFor(dish: CanteenDish, stall: CanteenStall | undefined): StallAddOn[] {
  return (stall?.addOns ?? []).filter((addOn) => {
    if (addOn.dishes) return addOn.dishes.some((ref) => ref._ref === dish._id);
    if (addOn.courses) return addOn.courses.includes(dish.course);
    return true;
  });
}

/** Whether the dish is vegetarian, by itself or because its whole stall is. */
export function isVegetarian(dish: CanteenDish, stall: CanteenStall): boolean {
  return dish.vegetarian || stall.vegetarianStall === true;
}

/** Whether a dish meets one diet filter. Diets are about food, so drinks never match. Everything a halal stall sells is halal. */
export function meetsDiet(dish: CanteenDish, stall: CanteenStall, diet: DietKey): boolean {
  if (dish.course === "drink") return false;
  switch (diet) {
    case "nopork":
      return noPork(dish);
    case "nobeef":
      return !dish.protein.includes("beef");
    case "nochicken":
      return !dish.protein.includes("chicken");
    case "noseafood":
      return !dish.protein.includes("seafood") && !dish.protein.includes("fish");
    case "halal":
      return stall.halal;
    case "vegetarian":
      return isVegetarian(dish, stall);
  }
}

/* ------------------------------------------------------------------ *
 * Time, in Asia/Bangkok
 * ------------------------------------------------------------------ */

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const bangkokFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A moment as the clock on the wall in Asia/Bangkok shows it. */
export interface BangkokTime {
  /** "YYYY-MM-DD". */
  dateKey: string;
  /** 0 = Sunday through 6 = Saturday. */
  weekday: number;
  /** Minutes since midnight. */
  minutes: number;
}

/** Reads a moment in Asia/Bangkok. */
export function bangkokTime(date: Date): BangkokTime {
  const parts: Record<string, string> = {};
  for (const part of bangkokFormat.formatToParts(date)) parts[part.type] = part.value;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY_INDEX[parts.weekday ?? ""] ?? 0,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function dateKeyToUtc(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

/** Adds whole days to a "YYYY-MM-DD" key. */
export function addDays(dateKey: string, days: number): string {
  const moved = dateKeyToUtc(dateKey);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/** The Monday on or before the Bangkok date of `now`, as "YYYY-MM-DD". Weeks start on Monday. */
export function weekStartKey(now: Date): string {
  const { dateKey, weekday } = bangkokTime(now);
  return addDays(dateKey, -((weekday + 6) % 7));
}

/** The instant a Bangkok calendar day begins. */
export function bangkokDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

function toMinutes(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function blockAt(hours: OpeningHours[], at: BangkokTime): OpeningHours | undefined {
  return hours.find(
    (block) =>
      block.daysOfWeek.includes(at.weekday) &&
      toMinutes(block.opens) <= at.minutes &&
      at.minutes < toMinutes(block.closes),
  );
}

function canteenHours(settings: CanteenSettings | null): OpeningHours[] | undefined {
  const place = settings?.canteen as CampusPlace | undefined;
  return place && "openingHours" in place && place.openingHours && place.openingHours.length > 0
    ? place.openingHours
    : undefined;
}

/** The hours that apply to a stall: its own if it has any, otherwise the canteen's, otherwise unknown. */
export function hoursFor(settings: CanteenSettings | null, stall?: CanteenStall): OpeningHours[] | undefined {
  if (stall?.hours && stall.hours.length > 0) return stall.hours;
  return canteenHours(settings);
}

/**
 * Whether a stall is open at `date` by its SCHEDULED hours (the stall's own,
 * or the canteen's when it has none). Returns `null` when no hours are
 * recorded anywhere, because then nothing can be said either way. This is a
 * published schedule, not a live signal: it never knows about a stall that is
 * shut today.
 */
export function isOpenNow(settings: CanteenSettings | null, stall: CanteenStall | undefined, date: Date): boolean | null {
  const hours = hoursFor(settings, stall);
  if (!hours) return null;
  return blockAt(hours, bangkokTime(date)) !== undefined;
}

/**
 * The closing time ("HH:mm") of the scheduled block that contains `date`, or
 * null when it is outside the hours or none are recorded.
 */
export function closesAt(settings: CanteenSettings | null, stall: CanteenStall | undefined, date: Date): string | null {
  const hours = hoursFor(settings, stall);
  if (!hours) return null;
  return blockAt(hours, bangkokTime(date))?.closes ?? null;
}

/* ------------------------------------------------------------------ *
 * Prices
 * ------------------------------------------------------------------ */

/**
 * The price a budget check uses. With `includeVariants` it is the base price
 * plus the largest variant, the most the dish can cost, so a student who
 * wants the special (พิเศษ) is not told it fits when it does not.
 */
export function effectivePrice(dish: CanteenDish, includeVariants: boolean): number {
  if (!includeVariants) return dish.price;
  const extra = (dish.variants ?? []).reduce((most, variant) => Math.max(most, variant.delta), 0);
  return dish.price + extra;
}

/**
 * Median base price of the given dishes, or null for none. With an even
 * count it is the mean of the two middle prices, so it can end in .5.
 */
export function medianPrice(dishes: readonly CanteenDish[], includeVariants = false): number | null {
  if (dishes.length === 0) return null;
  const prices = dishes.map((dish) => effectivePrice(dish, includeVariants)).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 1 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
}

/** Dish types that count as "a plate of rice" for the typical price figure. */
const RICE_PLATE_TYPES: readonly DishType[] = ["rice", "curryOverRice", "madeToOrder"];

/** Dishes that count as a plate of rice: a main course of a rice type. */
function ricePlates(data: CanteenData): CanteenDish[] {
  return data.dishes.filter((dish) => dish.course === "main" && RICE_PLATE_TYPES.includes(dish.type));
}

/** The typical price of a plate of rice, computed from the dishes, or null when there are none. */
export function medianRicePrice(data: CanteenData, includeVariants = false): number | null {
  return medianPrice(ricePlates(data), includeVariants);
}

/** Lowest and highest base price among the dishes, or null for none. */
export function priceRange(dishes: readonly CanteenDish[]): { min: number; max: number } | null {
  if (dishes.length === 0) return null;
  const prices = dishes.map((dish) => dish.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Every dish mapped to a canonical dish, cheapest first, then by walking order of the stall. */
export function dishesInCanonical(data: CanteenData, canonicalId: string): CanteenDish[] {
  const { walkRank } = indexCanteen(data);
  return data.dishes
    .filter((dish) => dish.canonical?._ref === canonicalId)
    .sort(
      (a, b) =>
        a.price - b.price ||
        (walkRank.get(a.stall._ref) ?? 0) - (walkRank.get(b.stall._ref) ?? 0) ||
        a.slug.current.localeCompare(b.slug.current),
    );
}

/** The cheapest dish for a canonical dish (by base price), or null when none map to it. */
export function cheapestInCanonical(data: CanteenData, canonicalId: string): CanteenDish | null {
  return dishesInCanonical(data, canonicalId)[0] ?? null;
}

/** The "YYYY-MM-DD" every dish shares, or undefined when the list is empty or the dates differ. */
export function commonCheckedOn(dishes: readonly CanteenDish[]): string | undefined {
  const first = dishes[0]?.checkedOn;
  return first && dishes.every((dish) => dish.checkedOn === first) ? first : undefined;
}
