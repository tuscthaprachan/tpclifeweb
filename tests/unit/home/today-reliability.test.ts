import { describe, expect, it } from "vitest";
import { nextOpenFor } from "@/components/domain/home/openingHours";
import { mergeNoServiceToday } from "@/components/domain/shuttle/mergeToday";
import { getShuttleStatus } from "@/lib/shuttle/schedule";
import type { CampusPlace, ShuttleRoute } from "@/lib/content/types";

const at = (iso: string) => new Date(`${iso}+07:00`);

function route(slug: string, daysOfWeek: number[], first = "07:00"): ShuttleRoute {
  return {
    _id: slug,
    _type: "shuttleRoute",
    _createdAt: "",
    _updatedAt: "",
    name: { th: slug, en: slug },
    slug: { current: slug },
    stops: [],
    calendar: { daysOfWeek },
    departures: [first, "12:00"],
    isActive: true,
  } as unknown as ShuttleRoute;
}

const statuses = (routes: ShuttleRoute[], now: Date) => routes.map((r) => getShuttleStatus(r, now, { count: 2 }));

describe("mergeNoServiceToday", () => {
  const weekdays = [1, 2, 3, 4, 5];
  const sunday = at("2026-11-22T10:00:00");
  const saturday = at("2026-11-21T10:00:00");

  it("merges routes that all resume together on Monday", () => {
    const routes = [route("a", weekdays), route("b", weekdays)];
    const merged = mergeNoServiceToday(routes, statuses(routes, saturday), saturday);
    expect(merged).toEqual({ nextServiceDate: "2026-11-23", firstDeparture: "07:00", isTomorrow: false });
  });

  it("says tomorrow when the next service day is tomorrow", () => {
    const routes = [route("a", weekdays), route("b", weekdays)];
    expect(mergeNoServiceToday(routes, statuses(routes, sunday), sunday)?.isTomorrow).toBe(true);
  });

  it("keeps one row per route when states or resume times differ", () => {
    const mixed = [route("a", weekdays), route("b", [0, 1, 2, 3, 4, 5, 6])];
    expect(mergeNoServiceToday(mixed, statuses(mixed, sunday), sunday)).toBeNull();
    const differentStart = [route("a", weekdays), route("b", weekdays, "08:00")];
    expect(mergeNoServiceToday(differentStart, statuses(differentStart, sunday), sunday)).toBeNull();
    expect(mergeNoServiceToday([], [], sunday)).toBeNull();
  });
});

describe("nextOpenFor", () => {
  const clinic = {
    _id: "c",
    _type: "place",
    _createdAt: "",
    _updatedAt: "",
    name: { th: "คลินิก", en: "Clinic" },
    slug: { current: "tu-virtual-clinic" },
    category: "welfare",
    openingHours: [
      { _key: "a", daysOfWeek: [1, 2, 3, 4, 5], opens: "08:30", closes: "12:00" },
      { _key: "b", daysOfWeek: [1, 2, 3, 4, 5], opens: "15:00", closes: "20:00" },
    ],
  } as CampusPlace;

  it("opens later today", () => {
    expect(nextOpenFor(clinic, at("2026-11-23T13:00:00"))).toEqual({ when: "today", dateKey: "2026-11-23", opens: "15:00" });
  });

  it("opens tomorrow after the last span", () => {
    expect(nextOpenFor(clinic, at("2026-11-23T21:00:00"))).toEqual({ when: "tomorrow", dateKey: "2026-11-24", opens: "08:30" });
  });

  it("opens on a later day over a weekend", () => {
    expect(nextOpenFor(clinic, at("2026-11-21T10:00:00"))).toEqual({ when: "later", dateKey: "2026-11-23", opens: "08:30" });
  });

  it("is null when open or with no hours", () => {
    expect(nextOpenFor(clinic, at("2026-11-23T09:00:00"))).toBeNull();
    expect(nextOpenFor({ ...clinic, openingHours: [] }, at("2026-11-23T09:00:00"))).toBeNull();
  });
});
