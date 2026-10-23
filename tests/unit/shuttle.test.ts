import { describe, expect, it } from "vitest";

import { findNextServiceDate, getShuttleStatus, isRunningToday, nextDepartures, originDepartures } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";

/**
 * Fixed clocks only, per CONTRIBUTING and the task brief: every `now` below
 * is a literal `new Date("...+07:00")` instant, never `new Date()`.
 *
 * Calendar reference (Asia/Bangkok, verified against the campus calendar):
 *   2026-08-07 Fri   2026-08-11 Tue   2026-08-15 Sat (added exception)
 *   2026-08-08 Sat   2026-08-12 Wed (excluded holiday)
 *   2026-08-09 Sun   2026-08-13 Thu
 *   2026-08-10 Mon   2026-08-14 Fri
 */

function makeRoute(overrides: Partial<ShuttleRoute> = {}): ShuttleRoute {
  return {
    _id: "route-1",
    _type: "shuttleRoute",
    _createdAt: "2026-01-01T00:00:00.000Z",
    _updatedAt: "2026-01-01T00:00:00.000Z",
    name: { th: "ธรรมศาสตร์ท่าพระจันทร์ ถึง เซ็นทรัลปิ่นเกล้า", en: "Thammasat Tha Prachan to Central Pinklao" },
    slug: { current: "tha-prachan-pinklao" },
    stops: [
      { _key: "origin", name: { th: "ธรรมศาสตร์ท่าพระจันทร์", en: "Thammasat Tha Prachan" }, offsetMinutes: 0 },
      { _key: "downstream", name: { th: "เซ็นทรัลปิ่นเกล้า", en: "Central Pinklao" }, offsetMinutes: 15 },
    ],
    calendar: {
      daysOfWeek: [1, 2, 3, 4, 5],
      excludedDates: ["2026-08-12"],
      addedDates: ["2026-08-15"],
      validFrom: "2026-08-01",
      validUntil: "2026-12-01",
    },
    departures: ["07:00", "08:30", "10:00", "17:00"],
    isActive: true,
    ...overrides,
  };
}

describe("isRunningToday", () => {
  it("is true on an ordinary weekday within the validity window", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-08-10T06:00:00+07:00"))).toBe(true);
  });

  it("is false on a weekend when the route is weekday-only", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-08-08T09:00:00+07:00"))).toBe(false);
  });

  it("is false on an excludedDates public holiday even though it falls on a normal service weekday", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-08-12T09:00:00+07:00"))).toBe(false);
  });

  it("is true on an addedDates exception even though it falls on a day of week the route does not normally serve", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-08-15T09:00:00+07:00"))).toBe(true);
  });

  it("is false before validFrom", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-01-15T09:00:00+07:00"))).toBe(false);
  });

  it("is false after validUntil", () => {
    expect(isRunningToday(makeRoute(), new Date("2026-12-15T09:00:00+07:00"))).toBe(false);
  });
});

describe("getShuttleStatus", () => {
  it("is running before the first departure of the day, counting down to it", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-10T06:45:00+07:00"));
    expect(status.kind).toBe("running");
    if (status.kind !== "running") throw new Error("unreachable");
    expect(status.departures[0]).toMatchObject({ originTime: "07:00", minutesUntil: 15 });
  });

  it("is running between two departures, returning the next one and skipping the one that already left", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-10T09:00:00+07:00"));
    expect(status.kind).toBe("running");
    if (status.kind !== "running") throw new Error("unreachable");
    expect(status.departures[0]).toMatchObject({ originTime: "10:00", minutesUntil: 60 });
  });

  it("still includes a departure at the exact minute it leaves, with zero minutes until", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-10T08:30:00+07:00"));
    expect(status.kind).toBe("running");
    if (status.kind !== "running") throw new Error("unreachable");
    expect(status.departures[0]).toMatchObject({ originTime: "08:30", minutesUntil: 0 });
  });

  it("is finishedForToday after the last departure has gone, pointing at the next service date", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-10T17:01:00+07:00"));
    expect(status).toEqual({ kind: "finishedForToday", nextServiceDate: "2026-08-11" });
  });

  it("is notToday on a weekend, pointing at the following Monday", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-08T09:00:00+07:00"));
    expect(status).toEqual({ kind: "notToday", nextServiceDate: "2026-08-10" });
  });

  it("is notToday on an excludedDates public holiday, pointing at the next weekday", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-12T09:00:00+07:00"));
    expect(status).toEqual({ kind: "notToday", nextServiceDate: "2026-08-13" });
  });

  it("is running on an addedDates exception day", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-08-15T06:00:00+07:00"));
    expect(status.kind).toBe("running");
    if (status.kind !== "running") throw new Error("unreachable");
    expect(status.departures[0]).toMatchObject({ originTime: "07:00" });
  });

  it("is notToday before validFrom, pointing at the first service weekday on or after it", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-01-15T09:00:00+07:00"));
    // validFrom is 2026-08-01, a Saturday; the next weekday on/after it is Monday 2026-08-03.
    expect(status).toEqual({ kind: "notToday", nextServiceDate: "2026-08-03" });
  });

  it("finds no next service date once validUntil has passed for good, rather than searching forever", () => {
    const status = getShuttleStatus(makeRoute(), new Date("2026-12-15T09:00:00+07:00"));
    expect(status).toEqual({ kind: "notToday", nextServiceDate: null });
  });

  it("is noTimetable for a route with no departures configured, regardless of the day", () => {
    const status = getShuttleStatus(makeRoute({ departures: [] }), new Date("2026-08-10T09:00:00+07:00"));
    expect(status).toEqual({ kind: "noTimetable" });
  });

  it("rolls over at midnight to the next Asia/Bangkok service day rather than staying stuck on the previous day's schedule", () => {
    const route = makeRoute();

    const lateNight = getShuttleStatus(route, new Date("2026-08-10T23:59:00+07:00"));
    expect(lateNight).toEqual({ kind: "finishedForToday", nextServiceDate: "2026-08-11" });

    const justAfterMidnight = getShuttleStatus(route, new Date("2026-08-11T00:05:00+07:00"));
    expect(justAfterMidnight.kind).toBe("running");
    if (justAfterMidnight.kind !== "running") throw new Error("unreachable");
    expect(justAfterMidnight.departures[0]).toMatchObject({ originTime: "07:00", minutesUntil: 415 });
  });
});

describe("nextDepartures with a per-stop offset", () => {
  it("applies the stop's offsetMinutes to both the shown time and the countdown", () => {
    const route = makeRoute();
    const downstream = route.stops[1];
    if (!downstream) throw new Error("fixture missing its downstream stop");

    const [first] = nextDepartures(route, new Date("2026-08-10T06:45:00+07:00"), 1, downstream);
    expect(first).toMatchObject({
      originTime: "07:00",
      stopTime: "07:15",
      stopMinutesOfDay: 435,
      minutesUntil: 30,
    });
  });

  it("returns the origin time unchanged when no stop is given", () => {
    const route = makeRoute();
    const [first] = nextDepartures(route, new Date("2026-08-10T06:45:00+07:00"), 1);
    expect(first).toMatchObject({ originTime: "07:00", stopTime: "07:00" });
  });

  it("returns an empty list on a day the route does not run, rather than falling back to the origin schedule", () => {
    expect(nextDepartures(makeRoute(), new Date("2026-08-08T09:00:00+07:00"), 3)).toEqual([]);
  });
});

describe("findNextServiceDate", () => {
  it("returns today's date when called for a day the route is already running, at offset 0", () => {
    expect(findNextServiceDate(makeRoute(), new Date("2026-08-10T06:00:00+07:00"), 0)).toBe("2026-08-10");
  });

  it("skips an excludedDates holiday that would otherwise be the next weekday", () => {
    // From Tuesday 2026-08-11, the next day is Wednesday 2026-08-12, which is excluded.
    expect(findNextServiceDate(makeRoute(), new Date("2026-08-11T09:00:00+07:00"), 1)).toBe("2026-08-13");
  });
});

describe("originDepartures", () => {
  it("parses and reformats every configured departure, in order", () => {
    const route = makeRoute();
    expect(originDepartures(route).map((d) => d.time)).toEqual(["07:00", "08:30", "10:00", "17:00"]);
  });

  it("is empty for a route with no departures configured, the honest state for an unpublished timetable", () => {
    expect(originDepartures(makeRoute({ departures: [] }))).toEqual([]);
  });

  it("skips a malformed entry rather than throwing", () => {
    const route = makeRoute({ departures: ["07:00", "not-a-time", "10:00"] });
    expect(originDepartures(route).map((d) => d.raw)).toEqual(["07:00", "10:00"]);
  });
});
