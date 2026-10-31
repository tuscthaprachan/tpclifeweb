import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BUDGET_COLUMNS, FUND_COLUMNS, parseBudgetCsv, parseFundsCsv } from "@/lib/admin/open-data/csv-import";
import { auditLog, openDataBudgetLines, openDataDocuments, openDataFunds } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { importBudgetCsv, importFundsCsv } = await import("@/lib/admin/open-data/import");

const BUDGET_HEAD = BUDGET_COLUMNS.join(",");
const FUND_HEAD = FUND_COLUMNS.join(",");
const budgetCsv = (...rows: string[]) => `${BUDGET_HEAD}\r\n${rows.join("\r\n")}\r\n`;
const fundsCsv = (...rows: string[]) => `${FUND_HEAD}\r\n${rows.join("\r\n")}\r\n`;
const LINE = "2569,organisation,สภา,สภาฯ,[not applicable],[not applicable],9182.00,5";

describe("parseBudgetCsv", () => {
  it("accepts the published budget-lines.csv unchanged", () => {
    const text = readFileSync("data/open-data/tusc/tables/budget-lines.csv", "utf8");
    const result = parseBudgetCsv(text);
    expect(result.ok).toBe(true);
    expect(result.ok && result.rows.length).toBe(text.trim().split(/\r?\n/).length - 1);
    expect(result.ok && result.rows[0]).toMatchObject({ fiscalYear: 2569, view: "organisation", amount: "9182.00", sourcePage: 5, line: 2 });
  });

  it("reports missing, unknown and repeated columns", () => {
    const missing = parseBudgetCsv("fiscal_year_be,view\r\n2569,organisation\r\n");
    expect(missing).toMatchObject({ ok: false, reason: "headers", headers: { missing: expect.arrayContaining(["amount_thb"]), unexpected: [] } });
    const extra = parseBudgetCsv(`${BUDGET_HEAD},notes\r\n${LINE},x\r\n`);
    expect(extra).toMatchObject({ ok: false, reason: "headers", headers: { missing: [], unexpected: ["notes"] } });
    const repeated = parseBudgetCsv(`${BUDGET_HEAD},view\r\n${LINE},organisation\r\n`);
    expect(repeated).toMatchObject({ ok: false, reason: "headers", headers: { duplicated: ["view"] } });
  });

  it("refuses an empty file or one with only a header", () => {
    expect(parseBudgetCsv("")).toEqual({ ok: false, reason: "empty" });
    expect(parseBudgetCsv(`${BUDGET_HEAD}\r\n`)).toEqual({ ok: false, reason: "empty" });
  });

  it("lists every bad row with its line and column, and returns no rows", () => {
    const result = parseBudgetCsv(
      budgetCsv(
        LINE,
        "69,organisation,สภา,สภาฯ,p,c,10,5",
        "2569,total,สภา,สภาฯ,p,c,10,5",
        "2569,project,สภา,,p,c,10,5",
        "2569,project,สภา,สภาฯ,p,c,ten,5",
        "2569,project,สภา,สภาฯ,p2,c,10,abc",
        LINE,
      ),
    );
    expect(result).toMatchObject({ ok: false, reason: "rows", more: 0 });
    const errors = result.ok === false && result.reason === "rows" ? result.errors.map((e) => [e.line, e.column, e.code]) : [];
    expect(errors).toEqual([
      [3, "fiscal_year_be", "year"],
      [4, "view", "view"],
      [5, "organisation", "required"],
      [6, "amount_thb", "amount"],
      [7, "source_page", "page"],
      [8, "organisation", "duplicate"],
    ]);
  });

  it("accepts a bracketed marker or blank source page as no page", () => {
    const result = parseBudgetCsv(budgetCsv("2569,organisation,สภา,สภาฯ,p,c,10,[not stated]", "2569,organisation,สภา,อื่น,p,c,10,"));
    expect(result.ok && result.rows.map((r) => r.sourcePage)).toEqual([null, null]);
  });
});

describe("parseFundsCsv", () => {
  it("accepts the published university-funds.csv unchanged", () => {
    const text = readFileSync("data/open-data/tusc/tables/university-funds.csv", "utf8");
    const result = parseFundsCsv(text);
    expect(result.ok).toBe(true);
    expect(result.ok && result.rows[0]).toMatchObject({ number: 1, code: "42001", annotation: "[none]" });
  });

  it("reports row problems and repeated numbers", () => {
    const result = parseFundsCsv(fundsCsv("1,type,42001,name,", "x,type,42002,name,", "1,type,42003,name,", "2,,42004,name,"));
    const errors = result.ok === false && result.reason === "rows" ? result.errors.map((e) => [e.line, e.column, e.code]) : [];
    expect(errors).toEqual([
      [3, "no", "number"],
      [4, "no", "duplicate"],
      [5, "fund_type", "required"],
    ]);
  });

  it("rejects the budget file's headers", () => {
    expect(parseFundsCsv(budgetCsv(LINE))).toMatchObject({ ok: false, reason: "headers" });
  });
});

describe("import", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let actor: { userId: string; context: { actorUserId: string } };

  beforeAll(async () => {
    ({ db } = await createTestDb());
    const userId = await makeUser(db);
    actor = { userId, context: { actorUserId: userId } };
  });

  beforeEach(async () => {
    revalidateFor.mockClear();
    await db.delete(openDataBudgetLines);
    await db.delete(openDataFunds);
    await db.delete(openDataDocuments);
  });

  it("adds budget lines, records one audit entry and expires the budget tag", async () => {
    const result = await importBudgetCsv({ db, actor, owner: "tusu", text: budgetCsv(LINE, "2569,project,สภา,สภาฯ,โครงการ,หมวด,100.5,6") });
    expect(result).toEqual({ ok: true, created: 2, updated: 0, unchanged: 0, total: 2 });
    const rows = await db.select().from(openDataBudgetLines).orderBy(openDataBudgetLines.position);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ owner: "tusu", status: "published", amount: "9182.00", createdBy: actor.userId, position: 1 });
    expect(rows[1]).toMatchObject({ amount: "100.50", position: 2 });
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "open_data_budget_lines.import"));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorUserId: actor.userId, entityType: "open_data_budget_lines", after: { owner: "tusu", created: 2, total: 2 } });
    expect(revalidateFor).toHaveBeenCalledWith("openDataBudget");
  });

  it("updates rows that match by key and leaves identical ones alone", async () => {
    await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE) });
    const again = await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE, "2569,project,สภา,สภาฯ,p,c,5,1") });
    expect(again).toMatchObject({ ok: true, created: 1, updated: 0, unchanged: 1 });
    const changed = await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv("2569,organisation,สภา,สภาฯ,[not applicable],[not applicable],9999.00,5") });
    expect(changed).toMatchObject({ ok: true, created: 0, updated: 1 });
    const [row] = await db.select().from(openDataBudgetLines).where(eq(openDataBudgetLines.view, "organisation"));
    expect(row?.amount).toBe("9999.00");
    expect(await db.select().from(openDataBudgetLines)).toHaveLength(2);
  });

  it("keeps each body's rows apart", async () => {
    await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE) });
    const other = await importBudgetCsv({ db, actor, owner: "tusu", text: budgetCsv(LINE) });
    expect(other).toMatchObject({ ok: true, created: 1, updated: 0 });
  });

  it("saves nothing when any row is invalid", async () => {
    const audited = (await db.select().from(auditLog)).length;
    const result = await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE, "2569,organisation,สภา,อื่น,p,c,oops,5") });
    expect(result).toMatchObject({ ok: false, reason: "rows" });
    expect(await db.select().from(openDataBudgetLines)).toHaveLength(0);
    expect((await db.select().from(auditLog)).length).toBe(audited);
    expect(revalidateFor).not.toHaveBeenCalled();
  });

  it("links the lines to a source document of the same body, and refuses an unknown number", async () => {
    const [doc] = await db
      .insert(openDataDocuments)
      .values({ owner: "tusc", number: "48", slug: "48-budget", type: "report", titleEn: "Budget" })
      .returning({ id: openDataDocuments.id });
    expect(await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE), sourceDocumentNumber: "99" })).toEqual({ ok: false, reason: "source" });
    expect(await importBudgetCsv({ db, actor, owner: "tusu", text: budgetCsv(LINE), sourceDocumentNumber: "48" })).toEqual({ ok: false, reason: "source" });
    expect(await db.select().from(openDataBudgetLines)).toHaveLength(0);
    await importBudgetCsv({ db, actor, owner: "tusc", text: budgetCsv(LINE), sourceDocumentNumber: "48" });
    const [row] = await db.select().from(openDataBudgetLines);
    expect(row?.sourceDocumentId).toBe(doc?.id);
  });

  it("imports funds, updates by number and records the audit entry", async () => {
    const first = await importFundsCsv({ db, actor, owner: "tusc", text: fundsCsv("1,ประเภท,42001,ทุน ก,[none]", "2,ประเภท,42002,ทุน ข,") });
    expect(first).toEqual({ ok: true, created: 2, updated: 0, unchanged: 0, total: 2 });
    const second = await importFundsCsv({ db, actor, owner: "tusc", text: fundsCsv("1,ประเภท,42001,ทุน ก,[none]", "2,ประเภท,42002,ทุน ข ใหม่,") });
    expect(second).toMatchObject({ ok: true, created: 0, updated: 1, unchanged: 1 });
    const rows = await db.select().from(openDataFunds).orderBy(openDataFunds.number);
    expect(rows.map((r) => [r.name, r.annotation])).toEqual([["ทุน ก", "[none]"], ["ทุน ข ใหม่", null]]);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "open_data_funds.import"))).toHaveLength(2);
    expect(revalidateFor).toHaveBeenCalledWith("openDataFund");
  });

  it("saves no funds when a row is invalid", async () => {
    const result = await importFundsCsv({ db, actor, owner: "tusc", text: fundsCsv("1,t,c,n,", "1,t,c,n,") });
    expect(result).toMatchObject({ ok: false, reason: "rows" });
    expect(await db.select().from(openDataFunds)).toHaveLength(0);
  });
});
