import { describe, expect, it } from "vitest";
import { addWorkingDays, workingDaysUntil } from "@/lib/complaints/working-days";

// 2026-03-09 is a Monday. Noon in Bangkok is 05:00 UTC.
const at = (iso: string) => new Date(`${iso}T05:00:00Z`);
const bangkokDay = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

describe("working days", () => {
  it("counts weekdays and falls due at the end of the Bangkok day", () => {
    const due = addWorkingDays(at("2026-03-09"), 2);
    expect(bangkokDay(due)).toBe("2026-03-11");
    expect(new Date(due.getTime() + 7 * 3600_000).toISOString().slice(11, 19)).toBe("23:59:59");
  });
  it("skips the weekend", () => {
    expect(bangkokDay(addWorkingDays(at("2026-03-12"), 2))).toBe("2026-03-16"); // Thursday + 2
    expect(bangkokDay(addWorkingDays(at("2026-03-14"), 1))).toBe("2026-03-16"); // Saturday + 1
    expect(bangkokDay(addWorkingDays(at("2026-03-09"), 10))).toBe("2026-03-23");
  });
  it("uses the Bangkok date near midnight UTC", () => {
    // 20:00 UTC on Friday is 03:00 Saturday in Bangkok, so one working day is Monday.
    expect(bangkokDay(addWorkingDays(new Date("2026-03-13T20:00:00Z"), 1))).toBe("2026-03-16");
  });
  it("counts days left, negative once past", () => {
    expect(workingDaysUntil(at("2026-03-09"), addWorkingDays(at("2026-03-09"), 3))).toBe(3);
    expect(workingDaysUntil(at("2026-03-09"), at("2026-03-09"))).toBe(0);
    expect(workingDaysUntil(at("2026-03-12"), at("2026-03-09"))).toBe(-3);
    expect(workingDaysUntil(at("2026-03-13"), at("2026-03-16"))).toBe(1);
  });
});
