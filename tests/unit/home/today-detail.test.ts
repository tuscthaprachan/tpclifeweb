import { describe, expect, it } from "vitest";
import { hoursForDays, hoursOnDate, minutesUntilClock, nextOpeningAfterToday, upcomingSpecialHours, usualHours } from "@/components/domain/home/openingHours";
import { formatDays, formatSpan } from "@/components/domain/today/format";
import type { OpeningHours } from "@/lib/content/types";

const WEEKDAYS = [1, 2, 3, 4, 5];
const at = (iso: string) => new Date(`${iso}+07:00`);

const hours: OpeningHours[] = [
  { _key: "a", daysOfWeek: WEEKDAYS, opens: "08:30", closes: "21:30" },
  { _key: "b", daysOfWeek: [6], opens: "09:00", closes: "16:00", note: { th: "เสาร์", en: "Saturday" } },
  { _key: "c", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], opens: "08:30", closes: "02:00", validFrom: "2026-11-23", validUntil: "2026-11-29" },
  { _key: "d", daysOfWeek: [1, 2, 3, 4, 5], opens: "10:00", closes: "15:00", validFrom: "2026-12-28", validUntil: "2027-01-02" },
];

describe("hoursOnDate", () => {
  it("uses the usual rows on an undated day", () => {
    expect(hoursOnDate(hours, "2026-11-19")).toEqual({ dateKey: "2026-11-19", special: false, spans: [{ opens: "08:30", closes: "21:30", overnight: false, note: undefined }] });
  });

  it("is closed on a day no usual row covers", () => {
    expect(hoursOnDate(hours, "2026-11-22").spans).toEqual([]);
  });

  it("lets a dated row replace the usual ones and marks overnight closing", () => {
    expect(hoursOnDate(hours, "2026-11-22")).toMatchObject({ special: false });
    expect(hoursOnDate(hours, "2026-11-24")).toMatchObject({ special: true, spans: [{ opens: "08:30", closes: "02:00", overnight: true }] });
  });
});

describe("hoursForDays", () => {
  it("starts today and covers seven Bangkok dates", () => {
    const days = hoursForDays(hours, at("2026-11-19T23:30:00"));
    expect(days.map((d) => d.dateKey)).toEqual(["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(days[2]!.spans[0]!.note).toEqual({ th: "เสาร์", en: "Saturday" });
  });
});

describe("usualHours and upcomingSpecialHours", () => {
  it("lists only undated rows, Monday first", () => {
    expect(usualHours(hours).map((row) => row.days)).toEqual([WEEKDAYS, [6]]);
  });

  it("lists dated rows that start after the seven days shown", () => {
    const rows = upcomingSpecialHours(hours, at("2026-11-19T12:00:00"));
    expect(rows.map((row) => row.validFrom)).toEqual(["2026-12-28"]);
  });

  it("drops dated rows that have ended", () => {
    expect(upcomingSpecialHours(hours, at("2027-01-05T12:00:00"))).toEqual([]);
  });
});

describe("nextOpeningAfterToday and minutesUntilClock", () => {
  it("finds the next day that opens", () => {
    expect(nextOpeningAfterToday(hours, at("2026-11-21T18:00:00"))).toEqual({ dateKey: "2026-11-23", opens: "08:30" });
    expect(nextOpeningAfterToday([{ _key: "x", daysOfWeek: [3], opens: "09:00", closes: "10:00" }], at("2026-11-19T12:00:00"))).toEqual({ dateKey: "2026-11-25", opens: "09:00" });
  });

  it("counts minutes to a closing time today or after midnight", () => {
    expect(minutesUntilClock("21:30", false, at("2026-11-19T20:00:00"))).toBe(90);
    expect(minutesUntilClock("02:00", true, at("2026-11-19T23:00:00"))).toBe(180);
  });
});

describe("formatDays and formatSpan", () => {
  it("says days the way a person would", () => {
    expect(formatDays([0, 1, 2, 3, 4, 5, 6], "en")).toBe("Every day");
    expect(formatDays(WEEKDAYS, "en")).toBe("Monday to Friday");
    expect(formatDays([6, 0], "en")).toBe("Saturday, Sunday");
    expect(formatDays([1, 3, 5], "en")).toBe("Monday, Wednesday, Friday");
  });

  it("names the next day for an overnight span", () => {
    expect(formatSpan({ opens: "08:30", closes: "02:00", overnight: true }, "en")).toBe("08:30 to 02:00 the next day");
    expect(formatSpan({ opens: "08:30", closes: "21:30", overnight: false }, "en")).toBe("08:30 to 21:30");
  });
});
