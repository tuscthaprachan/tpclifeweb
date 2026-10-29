/** Opening a loan request, on PGlite with the real migrations. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { borrowingLines, borrowingRequests, cases } from "@/lib/db/schema";
import { BorrowingError } from "@/lib/borrowing/errors";
import { findShortfalls } from "@/lib/borrowing/availability";
import { at, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

describe("createLoanRequest", () => {
  it("opens a BR case with its request, lines and a tracking token, and keeps the student number encrypted", async () => {
    const made = await t.request();
    expect(made.reference).toMatch(/^BR-2026-\d{4}$/);
    expect(made.token).toHaveLength(43);
    const [row] = await t.db.select().from(cases).where(eq(cases.id, made.caseId));
    expect(row!.service).toBe("borrowing");
    expect(row!.status).toBe("requested");
    const [req] = await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, made.caseId));
    expect(req!.studentIdEnc).not.toContain("6501234567");
    const lines = await t.db.select().from(borrowingLines).where(eq(borrowingLines.caseId, made.caseId));
    expect(lines.map((l) => l.quantity)).toEqual([2]);
  });

  it("holds stock while requested, so the last units cannot be promised twice", async () => {
    const football = await t.item("football");
    const left = await findShortfalls(t.db, [{ itemId: football.id, quantity: 3 }], at("2026-03-12"), at("2026-03-13", "16:00"), { now: NOW });
    expect(left).toEqual([{ itemId: football.id, requested: 3, available: 2 }]);
    await t.request({ lines: [{ itemId: football.id, quantity: 2 }] });
    await expect(t.request({ lines: [{ itemId: football.id, quantity: 1 }] })).rejects.toMatchObject({ code: "unavailable" });
    const later = await findShortfalls(t.db, [{ itemId: football.id, quantity: 4 }], at("2026-03-13", "16:00"), at("2026-03-16", "16:00"), { now: NOW });
    expect(later).toEqual([]);
  });

  it("refuses radios without seven working days' notice and over the cap of 13", async () => {
    const red = await t.item("radio-red");
    const black = await t.item("radio-black");
    const soon = t.request({ lines: [{ itemId: red.id, quantity: 2 }] });
    await expect(soon).rejects.toBeInstanceOf(BorrowingError);
    await expect(soon).rejects.toMatchObject({ code: "invalid_lines" });
    const many = t.request({ collectAt: at("2026-03-18"), returnDueAt: at("2026-03-19"), lines: [{ itemId: red.id, quantity: 8 }, { itemId: black.id, quantity: 6 }] });
    await expect(many).rejects.toMatchObject({ code: "invalid_lines", detail: { lines: [{ code: "over_category_max", max: 13 }] } });
    const ok = await t.request({ collectAt: at("2026-03-18"), returnDueAt: at("2026-03-19"), lines: [{ itemId: red.id, quantity: 13 }] });
    expect(ok.reference).toMatch(/^BR-/);
  });

  it("refuses a period outside desk days and hours", async () => {
    await expect(t.request({ collectAt: at("2026-03-14") })).rejects.toMatchObject({ code: "invalid_period" });
    await expect(t.request({ collectAt: at("2026-03-12", "08:00") })).rejects.toMatchObject({ code: "invalid_period" });
    await expect(t.request({ returnDueAt: at("2026-03-12", "09:00") })).rejects.toMatchObject({ code: "invalid_period" });
  });
});
