import { describe, expect, it } from "vitest";
import { msUntilNextMinute } from "@/lib/shuttle/ticker";
import { getShuttleStatus } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";

const route = {
  _id: "r",
  _type: "shuttleRoute",
  _createdAt: "2026-01-01T00:00:00.000Z",
  _updatedAt: "2026-01-01T00:00:00.000Z",
  name: { th: "ก", en: "A" },
  slug: { current: "a" },
  stops: [{ _key: "o", name: { th: "ก", en: "A" }, offsetMinutes: 0 }],
  calendar: { daysOfWeek: [1, 2, 3, 4, 5] },
  departures: ["08:00", "08:30"],
  isActive: true,
} as unknown as ShuttleRoute;

describe("msUntilNextMinute", () => {
  it("counts to the next whole minute", () => {
    expect(msUntilNextMinute(new Date("2026-08-10T08:00:15.250+07:00"))).toBe(44_750);
    expect(msUntilNextMinute(new Date("2026-08-10T08:00:59.999+07:00"))).toBe(1);
  });
  it("waits a full minute on a boundary", () => {
    expect(msUntilNextMinute(new Date("2026-08-10T08:00:00.000+07:00"))).toBe(60_000);
  });
});

describe("status across minute ticks", () => {
  const at = (time: string) => getShuttleStatus(route, new Date(`2026-08-10T${time}+07:00`), { count: 2 });

  it("advances to the next departure after one leaves", () => {
    const before = at("08:00:00");
    const after = at("08:01:00");
    expect(before.kind === "running" && before.departures[0]?.stopTime).toBe("08:00");
    expect(before.kind === "running" && before.departures[0]?.minutesUntil).toBe(0);
    expect(after.kind === "running" && after.departures[0]?.stopTime).toBe("08:30");
  });

  it("finishes for the day after the last departure", () => {
    expect(at("08:30:00").kind).toBe("running");
    expect(at("08:31:00").kind).toBe("finishedForToday");
  });
});
