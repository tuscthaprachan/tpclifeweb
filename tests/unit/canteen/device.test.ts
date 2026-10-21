import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultFilters, device } from "@/lib/canteen";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function throwingStorage() {
  const boom = () => {
    throw new Error("storage blocked");
  };
  return {
    get length(): number {
      return boom();
    },
    key: boom,
    getItem: boom,
    setItem: boom,
    removeItem: boom,
  } as unknown as ReturnType<typeof memoryStorage>;
}

let store: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  store = memoryStorage();
  device.setStorageProvider(() => store);
});

afterEach(() => {
  device.setStorageProvider(null);
});

describe("device storage", () => {
  it("is available when storage works", () => {
    expect(device.isStorageAvailable()).toBe(true);
    expect(store.map.size).toBe(0); // the probe cleans up after itself
  });

  it("stars and unstars dishes under the versioned prefix", () => {
    expect(device.toggleFavourite("fixture-dish-a")).toBe(true);
    expect(device.isFavourite("fixture-dish-a")).toBe(true);
    expect([...store.map.keys()]).toEqual(["trytpc.eat.v1.favourites"]);
    device.toggleFavourite("fixture-dish-a");
    expect(device.getFavourites()).toEqual([]);
  });

  it("returns referentially stable values, so useSyncExternalStore cannot loop", () => {
    device.toggleFavourite("x");
    expect(device.getFavourites()).toBe(device.getFavourites());
    expect(device.getHistory()).toBe(device.getHistory());
    expect(device.getHistory()).toBe(device.EMPTY_HISTORY);
    expect(device.getFavourites()).not.toBe(device.EMPTY_FAVOURITES);
    device.clearAll();
    expect(device.getFavourites()).toBe(device.EMPTY_FAVOURITES);
  });

  it("keeps dislikes apart from favourites", () => {
    device.toggleDislike("fixture-dish-b");
    expect(device.isDisliked("fixture-dish-b")).toBe(true);
    expect(device.isFavourite("fixture-dish-b")).toBe(false);
  });

  it("logs history with the price at the time, keeping the newest 300", () => {
    for (let i = 0; i < 305; i += 1) {
      device.addHistory({ slug: `d${i}`, price: 40, at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() });
    }
    const history = device.getHistory();
    expect(history).toHaveLength(device.MAX_HISTORY);
    expect(history[0]!.slug).toBe("d5");
    expect(history.at(-1)!.slug).toBe("d304");
    device.removeHistory(history.at(-1)!);
    expect(device.getHistory().at(-1)!.slug).toBe("d303");
  });

  it("ignores corrupt or tampered storage", () => {
    store.map.set("trytpc.eat.v1.favourites", "{not json");
    store.map.set("trytpc.eat.v1.history", JSON.stringify([{ slug: 1 }, { slug: "ok", price: 40, at: "2026-08-10T00:00:00Z" }, null]));
    store.map.set("trytpc.eat.v1.week", JSON.stringify({ seed: 1 }));
    expect(device.getFavourites()).toEqual([]);
    expect(device.getHistory()).toEqual([{ slug: "ok", price: 40, at: "2026-08-10T00:00:00Z" }]);
    expect(device.getSavedWeek()).toBeNull();
  });

  it("sums this week's spend, Monday to Sunday in Asia/Bangkok", () => {
    const at = (iso: string, price: number) => ({ slug: "x", price, at: iso });
    const history = [
      at("2026-08-09T23:30:00+07:00", 1000), // Sunday night, last week
      at("2026-08-10T00:10:00+07:00", 40), // Monday just after midnight Bangkok
      at("2026-08-12T12:00:00+07:00", 55),
      at("2026-08-16T23:30:00+07:00", 5), // the Sunday that ends this week
      at("2026-08-17T00:10:00+07:00", 2000), // next week
    ];
    expect(device.spendThisWeek(new Date("2026-08-12T13:00:00+07:00"), history)).toBe(100);
    expect(device.spendThisWeek(new Date("2026-08-16T20:00:00+07:00"), history)).toBe(100);
    expect(device.spendThisWeek(new Date("2026-08-09T20:00:00+07:00"), history)).toBe(1000);
    device.addHistory(at("2026-08-11T12:00:00+07:00", 45));
    expect(device.spendThisWeek(new Date("2026-08-12T13:00:00+07:00"))).toBe(45);
  });

  it("saves default filters in URL form and reads them back", () => {
    const filters = { ...defaultFilters(), max: 50, diet: ["nopork" as const], type: ["noodles" as const, "soup" as const] };
    expect(device.getDefaultFilters()).toBeNull();
    expect(device.setDefaultFilters(filters)).toBe(true);
    expect(device.getDefaultFilters()).toEqual(filters);
    expect(device.getDefaultFilters()).toBe(device.getDefaultFilters());
    device.clearDefaultFilters();
    expect(device.getDefaultFilters()).toBeNull();
  });

  it("saves and clears a week plan", () => {
    const week = { seed: "k7m2qx", budget: 250, days: [{ weekday: 1, slug: "fixture-dish-a", price: 40 }], savedAt: "2026-08-10T00:00:00Z" };
    device.setSavedWeek(week);
    expect(device.getSavedWeek()).toEqual(week);
    device.clearSavedWeek();
    expect(device.getSavedWeek()).toBeNull();
  });

  it("notifies subscribers on change, and stops after unsubscribe", () => {
    const listener = vi.fn();
    const stop = device.subscribe(listener);
    device.toggleFavourite("a");
    device.addHistory({ slug: "a", price: 40, at: "2026-08-10T00:00:00Z" });
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    device.toggleFavourite("b");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("one failing subscriber does not stop the others", () => {
    const good = vi.fn();
    const stopBad = device.subscribe(() => {
      throw new Error("bad subscriber");
    });
    const stopGood = device.subscribe(good);
    device.toggleFavourite("a");
    expect(good).toHaveBeenCalled();
    stopBad();
    stopGood();
  });

  it("clearAll removes only canteen keys", () => {
    store.map.set("something.else", "keep");
    device.toggleFavourite("a");
    device.addHistory({ slug: "a", price: 40, at: "2026-08-10T00:00:00Z" });
    device.setDefaultFilters(defaultFilters());
    expect(device.clearAll()).toBe(true);
    expect([...store.map.keys()]).toEqual(["something.else"]);
    expect(device.getFavourites()).toEqual([]);
  });

  it("moves legacy-prefixed keys to the new prefix on first use and removes the old ones", () => {
    store.map.set("tpclife.eat.v1.favourites", JSON.stringify(["old-dish"]));
    store.map.set("tpclife.eat.v1.dislikes", JSON.stringify(["bad-dish"]));
    store.map.set("unrelated", "keep");
    expect(device.getFavourites()).toEqual(["old-dish"]);
    expect(device.getDislikes()).toEqual(["bad-dish"]);
    expect([...store.map.keys()].sort()).toEqual(["trytpc.eat.v1.dislikes", "trytpc.eat.v1.favourites", "unrelated"]);
  });

  it("migrates before the first write and never overwrites an existing new key", () => {
    store.map.set("tpclife.eat.v1.favourites", JSON.stringify(["old-dish"]));
    store.map.set("tpclife.eat.v1.dislikes", JSON.stringify(["old-bad"]));
    store.map.set("trytpc.eat.v1.dislikes", JSON.stringify(["new-bad"]));
    device.toggleFavourite("added");
    expect(device.getFavourites()).toEqual(["old-dish", "added"]);
    expect(device.getDislikes()).toEqual(["new-bad"]);
    expect([...store.map.keys()].some((key) => key.startsWith("tpclife."))).toBe(false);
  });

  it("migrates only once, so legacy keys written afterwards are left alone", () => {
    device.getFavourites();
    store.map.set("tpclife.eat.v1.favourites", JSON.stringify(["late"]));
    expect(device.getFavourites()).toEqual([]);
    expect(store.map.has("tpclife.eat.v1.favourites")).toBe(true);
  });

  it("clears leftover legacy keys too", () => {
    device.toggleFavourite("a");
    store.map.set("tpclife.eat.v1.history", "[]");
    store.map.set("unrelated", "keep");
    expect(device.clearAll()).toBe(true);
    expect([...store.map.keys()]).toEqual(["unrelated"]);
  });

  it("survives storage that throws during migration", () => {
    device.setStorageProvider(() => throwingStorage());
    expect(device.getFavourites()).toEqual([]);
    expect(device.toggleFavourite("a")).toBe(false);
  });
});

describe("device storage that throws", () => {
  beforeEach(() => {
    device.setStorageProvider(() => throwingStorage());
  });

  it("reports unavailable and never throws", () => {
    expect(device.isStorageAvailable()).toBe(false);
    expect(() => device.getFavourites()).not.toThrow();
    expect(device.getFavourites()).toBe(device.EMPTY_FAVOURITES);
    expect(device.getHistory()).toBe(device.EMPTY_HISTORY);
    expect(device.getDefaultFilters()).toBeNull();
    expect(device.getSavedWeek()).toBeNull();
    expect(device.spendThisWeek(new Date("2026-08-12T00:00:00+07:00"))).toBe(0);
  });

  it("writes report failure instead of pretending to save", () => {
    expect(device.toggleFavourite("a")).toBe(false);
    expect(device.toggleDislike("a")).toBe(false);
    expect(device.addHistory({ slug: "a", price: 40, at: "2026-08-10T00:00:00Z" })).toBe(false);
    expect(device.setDefaultFilters(defaultFilters())).toBe(false);
    expect(device.clearAll()).toBe(false);
    expect(device.isFavourite("a")).toBe(false);
  });

  it("does not notify when a write failed", () => {
    const listener = vi.fn();
    const stop = device.subscribe(listener);
    device.toggleFavourite("a");
    expect(listener).not.toHaveBeenCalled();
    stop();
  });

  it("survives a provider that itself throws, as a blocked localStorage getter does", () => {
    device.setStorageProvider(() => {
      throw new Error("SecurityError");
    });
    expect(device.isStorageAvailable()).toBe(false);
    expect(device.getFavourites()).toBe(device.EMPTY_FAVOURITES);
    expect(device.toggleFavourite("a")).toBe(false);
  });

  it("is also safe when there is no storage at all, as on the server", () => {
    device.setStorageProvider(() => null);
    expect(device.isStorageAvailable()).toBe(false);
    expect(device.getHistory()).toBe(device.EMPTY_HISTORY);
    expect(device.toggleFavourite("a")).toBe(false);
  });
});
