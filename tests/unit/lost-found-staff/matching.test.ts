import { beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { describeMatch, explainMatch, MATCH_WINDOW_DAYS, rankMatches, scoreMatch, type MatchReasons } from "@/lib/lost-found/matching";
import { lfSetup, KEYS } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const base: MatchReasons = { sameCategory: true, samePlace: true, daysApart: 0, textSimilarity: 1 };

describe("scoreMatch", () => {
  it("gives 100 for a perfect match and 0 for nothing", () => {
    expect(scoreMatch(base)).toBe(100);
    expect(scoreMatch({ sameCategory: false, samePlace: false, daysApart: MATCH_WINDOW_DAYS, textSimilarity: 0 })).toBe(0);
  });

  it("weighs category above place above closeness", () => {
    const only = (r: Partial<MatchReasons>) => scoreMatch({ sameCategory: false, samePlace: false, daysApart: MATCH_WINDOW_DAYS, textSimilarity: 0, ...r });
    expect(only({ sameCategory: true })).toBe(40);
    expect(only({ samePlace: true })).toBe(20);
    expect(only({ daysApart: 0 })).toBe(15);
    expect(only({ textSimilarity: 0.6 })).toBe(25);
  });

  it("does not count place when either side has none", () => {
    expect(scoreMatch({ ...base, samePlace: null })).toBe(80);
  });

  it("loses closeness points with distance", () => {
    expect(scoreMatch({ ...base, daysApart: 15 })).toBeLessThan(scoreMatch(base));
  });
});

describe("describeMatch", () => {
  it("explains the score in words, in both languages", () => {
    expect(describeMatch({ sameCategory: true, samePlace: true, daysApart: 2, textSimilarity: 0.5 }, "en")).toBe("Same category, same place, 2 days apart, similar wording");
    expect(describeMatch({ sameCategory: true, samePlace: null, daysApart: 0, textSimilarity: 0 }, "en")).toBe("Same category, same day");
    expect(describeMatch({ sameCategory: true, samePlace: true, daysApart: 1, textSimilarity: 0.5 }, "th")).toContain("หมวดหมู่เดียวกัน");
    expect(explainMatch({ sameCategory: false, samePlace: false, daysApart: 1, textSimilarity: 0 })).toEqual(["lfcMatchOtherCategory", "lfcMatchOtherPlace", "lfcMatchOneDay"]);
  });
});

describe("rankMatches (pg_trgm on PGlite)", () => {
  let t: Awaited<ReturnType<typeof lfSetup>>;
  beforeAll(async () => {
    t = await lfSetup();
  }, 60_000);

  it("has the pg_trgm extension loaded", async () => {
    const result = await t.db.execute(sql`select similarity('red keyring', 'red keyring with keys')::float8 as s`);
    const rows = (result as unknown as { rows: Array<{ s: number }> }).rows;
    expect(rows[0]!.s).toBeGreaterThan(0.4);
  });

  it("ranks found items for a lost report by category, date window and wording", async () => {
    const lost = await t.lostReport(t.officer, { title: { th: "", en: "Red keyring" }, description: { th: "", en: "Three keys on a red keyring" } });
    const best = await t.foundItem(t.officer, { occurredOn: "2026-10-18" });
    const sameCategoryOnly = await t.foundItem(t.officer, { title: { th: "ชื่ออื่น", en: "Silver pendant" }, description: { th: "จี้", en: "A pendant on a chain" }, occurredOn: "2026-11-10" });
    const beforeLost = await t.foundItem(t.officer, { occurredOn: "2026-10-10" }); // found before it was lost: outside the window
    const wrongCategory = await t.foundItem(t.officer, { category: "umbrella", title: { th: "ร่ม", en: "Black umbrella" }, description: { th: "ร่มสีดำ", en: "A large black umbrella" }, occurredOn: "2026-10-18" });
    const afterWindow = await t.foundItem(t.officer, { occurredOn: "2026-12-30" });

    const ranked = await rankMatches(t.db, lost.caseId, t.officer);
    const ids = ranked.map((r) => r.caseId);
    expect(ids[0]).toBe(best.caseId);
    expect(ids).toContain(sameCategoryOnly.caseId);
    expect(ids).not.toContain(beforeLost.caseId);
    expect(ids).not.toContain(afterWindow.caseId);
    expect(ids).not.toContain(wrongCategory.caseId);
    expect(ranked[0]!.reasons).toMatchObject({ sameCategory: true, daysApart: 1 });
    expect(ranked[0]!.reasons.textSimilarity).toBeGreaterThan(0.5);
    expect(ranked[0]!.score).toBeGreaterThan(ranked.find((r) => r.caseId === sameCategoryOnly.caseId)!.score);
    expect(ranked.every((r) => r.kind === "found")).toBe(true);
  });

  it("includes a different category when the wording is very close", async () => {
    const lost = await t.lostReport(t.officer, { category: "bag", title: { th: "", en: "Grey rucksack with laptop sleeve" }, description: { th: "", en: "Grey rucksack with a padded laptop sleeve" }, occurredOn: "2026-09-01" });
    const found = await t.foundItem(t.officer, { category: "laptop", title: { th: "", en: "Grey rucksack with laptop sleeve" }, description: { th: "", en: "Grey rucksack with a padded laptop sleeve" }, occurredOn: "2026-09-02" });
    const ranked = await rankMatches(t.db, lost.caseId, t.officer);
    expect(ranked.map((r) => r.caseId)).toContain(found.caseId);
    expect(ranked.find((r) => r.caseId === found.caseId)!.reasons.sameCategory).toBe(false);
  });

  it("ranks lost reports for a found item the other way round", async () => {
    const found = await t.foundItem(t.officer, { title: { th: "", en: "Blue water bottle" }, description: { th: "", en: "A blue steel water bottle" }, category: "waterBottle", occurredOn: "2026-08-10" });
    const early = await t.lostReport(t.officer, { category: "waterBottle", title: { th: "", en: "Blue water bottle" }, description: { th: "", en: "A blue steel water bottle" }, occurredOn: "2026-08-08" });
    const late = await t.lostReport(t.officer, { category: "waterBottle", title: { th: "", en: "Blue water bottle" }, description: { th: "", en: "A blue steel water bottle" }, occurredOn: "2026-08-20" }); // lost after it was found
    const ranked = await rankMatches(t.db, found.caseId, t.officer);
    expect(ranked.map((r) => r.caseId)).toContain(early.caseId);
    expect(ranked.map((r) => r.caseId)).not.toContain(late.caseId);
    expect(ranked.every((r) => r.kind === "lost")).toBe(true);
  });

  it("refuses staff without a lost and found role", async () => {
    const lost = await t.lostReport();
    await expect(rankMatches(t.db, lost.caseId, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("matches the shared fixture so the tests above are not vacuous", () => {
    expect(KEYS.category).toBe("keys");
  });
});
