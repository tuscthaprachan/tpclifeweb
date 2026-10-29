/** Bangkok calendar arithmetic for loans. Pure functions, no database. */
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  bangkokInstant,
  dayKeyOf,
  dayStart,
  daysOfMonth,
  deskSlots,
  earliestCollectionDay,
  isDayKey,
  isDeskDay,
  isMonthKey,
  monthKeyOf,
  timeOf,
  weekdayOf,
} from "@/lib/borrowing/time";

describe("day keys", () => {
  it("accepts real dates and rejects impossible or malformed ones", () => {
    expect(isDayKey("2026-03-09")).toBe(true);
    expect(isDayKey("2028-02-29")).toBe(true);
    expect(isDayKey("2026-02-29")).toBe(false);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-13-01")).toBe(false);
    expect(isDayKey("2026-3-9")).toBe(false);
    expect(isDayKey(20260309)).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("reads the Bangkok day, which starts at 17:00 UTC the evening before", () => {
    expect(dayKeyOf(new Date("2026-03-09T16:59:59Z"))).toBe("2026-03-09");
    expect(dayKeyOf(new Date("2026-03-09T17:00:00Z"))).toBe("2026-03-10");
    expect(dayKeyOf(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });

  it("turns a day key into the instant its Bangkok midnight happens", () => {
    expect(dayStart("2026-03-09").toISOString()).toBe("2026-03-08T17:00:00.000Z");
    expect(dayKeyOf(dayStart("2026-03-09"))).toBe("2026-03-09");
    expect(dayKeyOf(new Date(dayStart("2026-03-09").getTime() - 1))).toBe("2026-03-08");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-03-09", 1)).toBe("2026-03-10");
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("desk days", () => {
  it("numbers weekdays from Sunday", () => {
    expect(weekdayOf("2026-03-08")).toBe(0);
    expect(weekdayOf("2026-03-09")).toBe(1);
    expect(weekdayOf("2026-03-14")).toBe(6);
  });

  it("is open Monday to Friday only", () => {
    expect(["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"].every(isDeskDay)).toBe(true);
    expect(isDeskDay("2026-03-14")).toBe(false);
    expect(isDeskDay("2026-03-15")).toBe(false);
  });
});

describe("bangkokInstant and timeOf", () => {
  it("is seven hours ahead of UTC", () => {
    expect(bangkokInstant("2026-03-12", "10:00")!.toISOString()).toBe("2026-03-12T03:00:00.000Z");
    expect(bangkokInstant("2026-03-12", "00:00")!.toISOString()).toBe("2026-03-11T17:00:00.000Z");
  });

  it("returns null for a malformed day or time", () => {
    expect(bangkokInstant("2026-02-30", "10:00")).toBeNull();
    expect(bangkokInstant("2026-03-12", "24:00")).toBeNull();
    expect(bangkokInstant("2026-03-12", "9:00")).toBeNull();
    expect(bangkokInstant("2026-03-12", "10:60")).toBeNull();
    expect(bangkokInstant("12 March", "10:00")).toBeNull();
  });

  it("round trips through dayKeyOf and timeOf", () => {
    const at = bangkokInstant("2026-03-12", "16:30")!;
    expect(dayKeyOf(at)).toBe("2026-03-12");
    expect(timeOf(at)).toBe("16:30");
  });
});

describe("deskSlots", () => {
  it("offers every half hour from 09:00 to 17:00 inclusive", () => {
    const slots = deskSlots();
    expect(slots).toHaveLength(17);
    expect(slots[0]).toBe("09:00");
    expect(slots[1]).toBe("09:30");
    expect(slots.at(-1)).toBe("17:00");
    expect(slots).toContain("12:30");
    expect(slots).not.toContain("08:30");
    expect(slots).not.toContain("17:30");
  });
});

describe("earliestCollectionDay", () => {
  const monday = new Date("2026-03-09T05:00:00Z");

  it("counts desk days after today, so Monday plus three is Thursday", () => {
    expect(earliestCollectionDay(monday, 3)).toBe("2026-03-12");
  });

  it("skips weekends", () => {
    const thursday = new Date("2026-03-12T05:00:00Z");
    expect(earliestCollectionDay(thursday, 3)).toBe("2026-03-17");
    const friday = new Date("2026-03-13T05:00:00Z");
    expect(earliestCollectionDay(friday, 1)).toBe("2026-03-16");
  });

  it("starts from the next desk day when asked on a weekend", () => {
    const saturday = new Date("2026-03-14T05:00:00Z");
    expect(earliestCollectionDay(saturday, 1)).toBe("2026-03-16");
    expect(earliestCollectionDay(saturday, 3)).toBe("2026-03-18");
  });

  it("allows today with no notice, and treats negative notice as none", () => {
    expect(earliestCollectionDay(monday, 0)).toBe("2026-03-09");
    expect(earliestCollectionDay(monday, -2)).toBe("2026-03-09");
  });

  it("works from the Bangkok day, not the UTC day", () => {
    const lateMondayUtc = new Date("2026-03-09T18:00:00Z");
    expect(dayKeyOf(lateMondayUtc)).toBe("2026-03-10");
    expect(earliestCollectionDay(lateMondayUtc, 1)).toBe("2026-03-11");
  });

  it("gives radios their seven working days", () => {
    expect(earliestCollectionDay(monday, 7)).toBe("2026-03-18");
  });
});

describe("months", () => {
  it("recognises month keys", () => {
    expect(isMonthKey("2026-03")).toBe(true);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-3")).toBe(false);
    expect(isMonthKey(undefined)).toBe(false);
    expect(monthKeyOf("2026-03-09")).toBe("2026-03");
  });

  it("lists every day of a month, including leap February", () => {
    const march = daysOfMonth("2026-03");
    expect(march).toHaveLength(31);
    expect(march[0]).toBe("2026-03-01");
    expect(march.at(-1)).toBe("2026-03-31");
    expect(daysOfMonth("2026-02")).toHaveLength(28);
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    expect(daysOfMonth("2026-04")).toHaveLength(30);
  });

  it("adds and subtracts months across year ends", () => {
    expect(addMonths("2026-03", 1)).toBe("2026-04");
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", 0)).toBe("2026-03");
    expect(addMonths("2026-01", 12)).toBe("2027-01");
    expect(addMonths("2026-03", -15)).toBe("2024-12");
  });
});
