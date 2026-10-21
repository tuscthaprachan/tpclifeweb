/**
 * Personal canteen data kept on this device only: favourites, history,
 * dislikes, default filters, a saved week and the weekly spend tally.
 *
 * Nothing here is ever sent anywhere. Every storage access is wrapped in
 * try/catch because `localStorage` can be missing or throw (private windows,
 * blocked site data, quota). When storage fails, reads return empty values and
 * writes return `false`; nothing is faked in memory, so the UI never claims it
 * saved something it did not. Use `isStorageAvailable()` to hide the pages
 * and options that need it. The rest of the service works without it.
 *
 * Keys carry the prefix `trytpc.eat.v1.`. Keys under the pre-rebrand prefix
 * `tpclife.eat.v1.` are moved across once, before the first read or write. Change the version if a stored
 * shape ever changes incompatibly.
 *
 * REACT. `subscribe` and the getters work with `useSyncExternalStore`.
 * Every getter returns the same object for unchanged data (and one shared
 * frozen empty value when there is none), so a snapshot is referentially
 * stable and React does not loop. Use the `EMPTY_*` constants as the server
 * snapshot.
 *
 * No `"use client"` directive on purpose: it is a plain module, safe to import
 * from a client component, and it does nothing on the server because it only
 * touches storage when called.
 */

import { addDays, bangkokDayStart, weekStartKey } from "./derive";
import { parse, serialise, type CanteenFilters } from "./params";

/** Every key this module writes starts with this. */
export const STORAGE_PREFIX = "trytpc.eat.v1.";

/** The prefix before the rebrand. Migrated to `STORAGE_PREFIX` on first use and removed by `clearAll`. */
export const LEGACY_STORAGE_PREFIX = "tpclife.eat.v1.";

const KEYS = {
  favourites: `${STORAGE_PREFIX}favourites`,
  history: `${STORAGE_PREFIX}history`,
  dislikes: `${STORAGE_PREFIX}dislikes`,
  defaults: `${STORAGE_PREFIX}defaults`,
  week: `${STORAGE_PREFIX}week`,
} as const;

/** The most history entries kept. Older ones are dropped first. */
export const MAX_HISTORY = 300;

/* ------------------------------------------------------------------ *
 * Storage access
 * ------------------------------------------------------------------ */

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function browserStorage(): StorageLike | null {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    // Merely reading `localStorage` throws when site data is blocked.
    return null;
  }
}

let provider: () => StorageLike | null = browserStorage;

/** Replaces where storage comes from. For tests. Pass null to restore the browser's `localStorage`. */
export function setStorageProvider(next: (() => StorageLike | null) | null): void {
  provider = next ?? browserStorage;
  migrated = false;
  cache.clear();
  defaultsCache.clear();
  notify();
}

function storage(): StorageLike | null {
  try {
    return provider();
  } catch {
    return null;
  }
}

let migrated = false;

/** Moves legacy-prefixed keys to the current prefix without overwriting an existing new key. Runs once per provider. */
function migrateLegacyKeys(): void {
  if (migrated) return;
  migrated = true;
  try {
    const store = storage();
    if (!store) return;
    const legacy: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key !== null && key.startsWith(LEGACY_STORAGE_PREFIX)) legacy.push(key);
    }
    for (const key of legacy) {
      const next = `${STORAGE_PREFIX}${key.slice(LEGACY_STORAGE_PREFIX.length)}`;
      const value = store.getItem(key);
      if (value !== null && store.getItem(next) === null) store.setItem(next, value);
      store.removeItem(key);
    }
  } catch {
    // Migration is best effort; a failure leaves the old keys where they were.
  }
}

function readRaw(key: string): string | null {
  migrateLegacyKeys();
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): boolean {
  migrateLegacyKeys();
  try {
    const store = storage();
    if (!store) return false;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether this device lets the page keep data. Probes with a real write, so a
 * full or read-only store reports false. Cheap, but not for every render:
 * call it once and keep the answer.
 */
export function isStorageAvailable(): boolean {
  const probe = `${STORAGE_PREFIX}probe`;
  const ok = writeRaw(probe, "1");
  if (ok) writeRaw(probe, null);
  return ok;
}

/* ------------------------------------------------------------------ *
 * Change notification, for useSyncExternalStore
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
let storageListenerAttached = false;

function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A broken subscriber must not stop the others hearing about the change.
    }
  }
}

function onStorageEvent(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith(STORAGE_PREFIX) || event.key.startsWith(LEGACY_STORAGE_PREFIX)) notify();
}

/**
 * Registers a callback for any change to the canteen data on this device,
 * including changes made in another tab. Returns the unsubscribe function.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", onStorageEvent);
    storageListenerAttached = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageListenerAttached && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
      storageListenerAttached = false;
    }
  };
}

/* ------------------------------------------------------------------ *
 * Stable, validated reads
 * ------------------------------------------------------------------ */

const cache = new Map<string, { raw: string | null; value: unknown }>();

/** Parses once per distinct stored string so repeated reads return the same object. */
function readValue<T>(key: string, empty: T, decode: (json: unknown) => T): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;

  let value = empty;
  if (raw !== null) {
    try {
      value = decode(JSON.parse(raw));
    } catch {
      value = empty;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function writeValue(key: string, value: unknown): boolean {
  const ok = writeRaw(key, JSON.stringify(value));
  if (ok) notify();
  return ok;
}

function removeValue(key: string): boolean {
  const ok = writeRaw(key, null);
  if (ok) notify();
  return ok;
}

function stringList(json: unknown): readonly string[] {
  if (!Array.isArray(json)) return EMPTY_LIST;
  const list = [...new Set(json.filter((item): item is string => typeof item === "string" && item.length > 0))];
  return list.length > 0 ? Object.freeze(list) : EMPTY_LIST;
}

/* ------------------------------------------------------------------ *
 * Favourites and dislikes
 * ------------------------------------------------------------------ */

const EMPTY_LIST: readonly string[] = Object.freeze([]);

/** Shared empty values, for use as the server snapshot of `useSyncExternalStore`. */
export const EMPTY_FAVOURITES: readonly string[] = EMPTY_LIST;
export const EMPTY_DISLIKES: readonly string[] = EMPTY_LIST;

/** Slugs of starred dishes, oldest first. */
export function getFavourites(): readonly string[] {
  return readValue(KEYS.favourites, EMPTY_FAVOURITES, stringList);
}

export function isFavourite(slug: string): boolean {
  return getFavourites().includes(slug);
}

/** Stars or unstars a dish. Returns false if it could not be saved. */
export function toggleFavourite(slug: string): boolean {
  const current = getFavourites();
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  return writeValue(KEYS.favourites, next);
}

/** Slugs the student never wants suggested. */
export function getDislikes(): readonly string[] {
  return readValue(KEYS.dislikes, EMPTY_DISLIKES, stringList);
}

export function isDisliked(slug: string): boolean {
  return getDislikes().includes(slug);
}

/** Adds or removes a dish from "never suggest this". Returns false if it could not be saved. */
export function toggleDislike(slug: string): boolean {
  const current = getDislikes();
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  return writeValue(KEYS.dislikes, next);
}

/* ------------------------------------------------------------------ *
 * History and spend
 * ------------------------------------------------------------------ */

/** One "I'll eat this". The price is what it cost when tapped, so the tally survives later price changes. */
export interface EatenEntry {
  slug: string;
  /** Baht. */
  price: number;
  /** ISO timestamp. */
  at: string;
}

export const EMPTY_HISTORY: readonly EatenEntry[] = Object.freeze([]);

function decodeHistory(json: unknown): readonly EatenEntry[] {
  if (!Array.isArray(json)) return EMPTY_HISTORY;
  const entries = json.filter(
    (item): item is EatenEntry =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as EatenEntry).slug === "string" &&
      typeof (item as EatenEntry).price === "number" &&
      Number.isFinite((item as EatenEntry).price) &&
      typeof (item as EatenEntry).at === "string" &&
      Number.isFinite(Date.parse((item as EatenEntry).at)),
  );
  return entries.length > 0 ? Object.freeze(entries) : EMPTY_HISTORY;
}

/** What has been eaten, oldest first. */
export function getHistory(): readonly EatenEntry[] {
  return readValue(KEYS.history, EMPTY_HISTORY, decodeHistory);
}

/** Logs a dish as eaten. Keeps the newest `MAX_HISTORY`. Returns false if it could not be saved. */
export function addHistory(entry: EatenEntry): boolean {
  return writeValue(KEYS.history, [...getHistory(), entry].slice(-MAX_HISTORY));
}

/** Removes one history entry (matched by slug and time), for a mis-tap. Returns false if it could not be saved. */
export function removeHistory(entry: Pick<EatenEntry, "slug" | "at">): boolean {
  return writeValue(
    KEYS.history,
    getHistory().filter((item) => !(item.slug === entry.slug && item.at === entry.at)),
  );
}

export function clearHistory(): boolean {
  return removeValue(KEYS.history);
}

/**
 * Baht logged this week, Monday to Sunday in Asia/Bangkok. It only counts
 * what the student tapped "I'll eat this" on; the UI must say so.
 */
export function spendThisWeek(now: Date, history: readonly EatenEntry[] = getHistory()): number {
  const startKey = weekStartKey(now);
  const start = bangkokDayStart(startKey).getTime();
  const end = bangkokDayStart(addDays(startKey, 7)).getTime();
  return history.reduce((sum, entry) => {
    const at = Date.parse(entry.at);
    return at >= start && at < end ? sum + entry.price : sum;
  }, 0);
}

/* ------------------------------------------------------------------ *
 * Default filters
 * ------------------------------------------------------------------ */

/** The student's saved starting filters, or null. Stored as the same query string the URL uses. */
export function getDefaultFilters(): CanteenFilters | null {
  const query = readValue<string | null>(KEYS.defaults, null, (json) => (typeof json === "string" ? json : null));
  return query === null ? null : getParsedDefaults(query);
}

const defaultsCache = new Map<string, CanteenFilters>();

/** Keeps `getDefaultFilters` referentially stable for an unchanged query string. */
function getParsedDefaults(query: string): CanteenFilters {
  let parsed = defaultsCache.get(query);
  if (!parsed) {
    parsed = parse(new URLSearchParams(query));
    defaultsCache.set(query, parsed);
  }
  return parsed;
}

/** Saves the filters as the starting point for "Decide for me". Returns false if it could not be saved. */
export function setDefaultFilters(filters: CanteenFilters): boolean {
  return writeValue(KEYS.defaults, serialise(filters));
}

export function clearDefaultFilters(): boolean {
  return removeValue(KEYS.defaults);
}

/* ------------------------------------------------------------------ *
 * Saved week
 * ------------------------------------------------------------------ */

/** A week plan the student chose to keep. Stores slugs and prices only, so it stays small. */
export interface SavedWeek {
  /** Seed that produced the plan, so it can be reopened. */
  seed: string;
  budget: number;
  /** The plan: one entry per day. The price is as at the time it was saved. */
  days: Array<{ weekday: number; slug: string; price: number }>;
  /** ISO timestamp. */
  savedAt: string;
}

function decodeSavedWeek(json: unknown): SavedWeek | null {
  if (typeof json !== "object" || json === null) return null;
  const week = json as Partial<SavedWeek>;
  if (typeof week.seed !== "string" || typeof week.budget !== "number" || typeof week.savedAt !== "string") return null;
  if (!Array.isArray(week.days)) return null;
  const days = week.days.filter(
    (day): day is SavedWeek["days"][number] =>
      typeof day === "object" &&
      day !== null &&
      Number.isInteger(day.weekday) &&
      typeof day.slug === "string" &&
      typeof day.price === "number",
  );
  return { seed: week.seed, budget: week.budget, savedAt: week.savedAt, days };
}

export function getSavedWeek(): SavedWeek | null {
  return readValue<SavedWeek | null>(KEYS.week, null, decodeSavedWeek);
}

/** Keeps a week plan on this device. Returns false if it could not be saved. */
export function setSavedWeek(week: SavedWeek): boolean {
  return writeValue(KEYS.week, week);
}

export function clearSavedWeek(): boolean {
  return removeValue(KEYS.week);
}

/* ------------------------------------------------------------------ *
 * Clear everything
 * ------------------------------------------------------------------ */

/**
 * Removes every canteen key from this device (anything starting with the
 * prefix or the legacy prefix, including keys from this version that were added later). Returns
 * false if storage could not be reached; true otherwise.
 */
export function clearAll(): boolean {
  try {
    const store = storage();
    if (!store) return false;
    const found: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key !== null && (key.startsWith(STORAGE_PREFIX) || key.startsWith(LEGACY_STORAGE_PREFIX))) found.push(key);
    }
    for (const key of found) store.removeItem(key);
    cache.clear();
    notify();
    return true;
  } catch {
    return false;
  }
}
