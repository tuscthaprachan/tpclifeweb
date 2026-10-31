import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { seedOpenData } from "@/lib/db/seed/open-data";
import { CSV_BOM, cell, csvBytes, csvField, csvText } from "@/lib/open-data/csv";
import {
  budgetLinesTable,
  committeesTable,
  decisionsTable,
  fundsTable,
  meetingsTable,
  membersTable,
  recommendationsTable,
  surveyTable,
} from "@/lib/open-data/datasets";
import {
  readBodies,
  readBudgetLines,
  readDecisions,
  readFunds,
  readMeetings,
  readMemberships,
  readRecommendations,
  readSurveyResults,
  type BudgetLineRow,
} from "@/lib/open-data/read";
import { budgetDownloads } from "@/components/domain/open-data/budget/downloads";
import { orgByName } from "@/components/domain/open-data/budget/labels";
import { bodyTables, bulletinYears, campusCategories, compareYears, organisationsByAmount, unionProjects } from "@/components/domain/open-data/budget/model";
import { PRINTED_TOTAL } from "@/components/domain/open-data/budget/printed";
import { FUNDS_PAGE_SIZE, fundKind, fundsHref, fundsView, parseFundFilter, parsePage, type FundListRow } from "@/components/domain/open-data/funds/kinds";
import { amountRange, pageRanges, typeCounts, viewCounts } from "@/components/domain/open-data/data/dictionary";
import { createTestDb } from "../db/harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let lines: BudgetLineRow[];

beforeAll(async () => {
  ctx = await createTestDb();
  await seedOpenData(ctx.db);
  lines = await readBudgetLines(ctx.db, "tusc");
});
afterAll(async () => {
  await ctx.client.close();
});

describe("csv text", () => {
  it("starts with a byte order mark, has one header row and CRLF line ends", () => {
    const text = csvText({ columns: ["a", "b"], rows: [["1", "x"]] });
    expect(text).toBe(`${CSV_BOM}a,b\r\n1,x\r\n`);
    expect(new TextEncoder().encode(text).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
  });

  it("quotes only what needs it and doubles quotes", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
    expect(csvField("ไทย")).toBe("ไทย");
  });

  it("never leaves a cell blank", () => {
    expect(cell(null)).toBe("[not stated]");
    expect(cell("")).toBe("[not stated]");
    expect(cell(0)).toBe("0");
    expect(cell(undefined, "[none]")).toBe("[none]");
  });

  it("counts bytes of the encoded file", () => {
    const table = { columns: ["ก"], rows: [] };
    expect(csvBytes(table)).toBe(3 + 3 + 2);
  });
});

describe("dataset tables from the stored rows", () => {
  it("has the row counts the source tables have", async () => {
    expect(membersTable(await readMemberships(ctx.db, "tusc")).rows).toHaveLength(149);
    expect(committeesTable(await readBodies(ctx.db, "tusc")).rows).toHaveLength(11);
    expect(meetingsTable(await readMeetings(ctx.db, "tusc")).rows).toHaveLength(7);
    expect(decisionsTable(await readDecisions(ctx.db, "tusc")).rows).toHaveLength(38);
    expect(budgetLinesTable(lines).rows).toHaveLength(91);
    expect(fundsTable(await readFunds(ctx.db, "tusc")).rows).toHaveLength(269);
    expect(recommendationsTable(await readRecommendations(ctx.db, "tusc")).rows.length).toBeGreaterThan(10);
    expect(surveyTable(await readSurveyResults(ctx.db, "tusc")).rows).toHaveLength(6);
  });

  it("writes every row with as many cells as the header and no blank cell", async () => {
    const tables = [
      membersTable(await readMemberships(ctx.db, "tusc")),
      committeesTable(await readBodies(ctx.db, "tusc")),
      meetingsTable(await readMeetings(ctx.db, "tusc")),
      decisionsTable(await readDecisions(ctx.db, "tusc")),
      budgetLinesTable(lines),
      fundsTable(await readFunds(ctx.db, "tusc")),
      recommendationsTable(await readRecommendations(ctx.db, "tusc")),
      surveyTable(await readSurveyResults(ctx.db, "tusc")),
    ];
    for (const table of tables) {
      for (const row of table.rows) {
        expect(row).toHaveLength(table.columns.length);
        for (const value of row) expect(value).not.toBe("");
      }
    }
  });

  it("keeps amounts, dates and counts as stored", async () => {
    const budget = budgetLinesTable(lines);
    const first = budget.rows.find((r) => r[0] === "2569" && r[1] === "organisation" && r[3] === "อมธ.");
    expect(first?.[6]).toBe("1171383.84");
    const meetings = meetingsTable(await readMeetings(ctx.db, "tusc"));
    expect(meetings.rows[0]?.[4]).toBe("2025-05-13");
    expect(meetings.rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[4] ?? ""))).toBe(true);
    expect(fundsTable(await readFunds(ctx.db, "tusc")).rows[0]).toEqual(["1", "ดอกผลกองทุนห้ามจ่ายขาดสำหรับเงินต้น", "42001", "ดอกผลทุน ผศ. เกรียงไกร วณิชพงศา", "[none]"]);
  });

  it("lists the survey with the most mentions first", async () => {
    const survey = surveyTable(await readSurveyResults(ctx.db, "tusc"));
    expect(survey.rows.map((r) => r[2])).toEqual(["150", "120", "40", "35", "6", "2"]);
  });
});

describe("budget bulletin model", () => {
  it("finds the bulletin year and knows every organisation name", () => {
    expect(bulletinYears(lines)).toEqual([2569]);
    for (const line of lines.filter((l) => l.view === "organisation")) expect(orgByName(line.organisation)).not.toBeNull();
  });

  it("sorts the organisations by amount", () => {
    const orgs = organisationsByAmount(lines, 2569);
    expect(orgs).toHaveLength(8);
    expect(orgs[0]?.amount).toBe("1171383.84");
    expect(orgs.map((o) => Number(o.amount))).toEqual([...orgs.map((o) => Number(o.amount))].sort((a, b) => b - a));
  });

  it("lists the 17 whole-campus categories with the shares the report prints", () => {
    const categories = campusCategories(lines, 2569);
    expect(categories).toHaveLength(17);
    expect(categories[0]?.share).toBe("38.67");
    expect(categories.every((c) => c.share !== null)).toBe(true);
  });

  it("puts all twelve organisations in the two-year comparison, joined across spellings", () => {
    const comparison = compareYears(lines, 2569, 2568);
    expect(comparison).toHaveLength(12);
    expect(comparison[0]?.org?.key).toBe("tusu");
    expect(comparison[0]?.previous?.amount).toBe("1248164.50");
    expect(comparison[0]?.current?.amount).toBe("1171383.84");
    expect(comparison.filter((r) => r.previous && r.current)).toHaveLength(6);
  });

  it("gives the Student Union seven projects, six with a printed share", () => {
    const projects = unionProjects(lines, 2569);
    expect(projects).toHaveLength(7);
    expect(projects[0]).toMatchObject({ project: "TPC Games 2025", share: "29.8" });
    expect(projects.filter((p) => p.share === null)).toHaveLength(1);
  });

  it("makes a table for each body in reading order", () => {
    const tables = bodyTables(lines, 2569);
    expect(tables.map((t) => t.key)).toEqual(["tusc", "film", "music", "dance", "asa", "host", "sad", "tusu"]);
    expect(tables.find((t) => t.key === "sad")?.projects).toBeNull();
  });

  it("builds the four figure files and the organisation file", () => {
    const files = budgetDownloads(lines, 2569, 2568);
    expect(Object.keys(files).sort()).toEqual(["figure-1.csv", "figure-2.csv", "figure-3.csv", "figure-4.csv", "organisations.csv"]);
    expect(files["figure-3.csv"]?.rows).toHaveLength(18);
    const earlier = budgetDownloads(lines, 2568, 2567);
    expect(Object.keys(earlier)).toEqual(["organisations.csv"]);
    expect(earlier["organisations.csv"]?.rows).toHaveLength(10);
    expect(earlier["organisations.csv"]?.rows.filter((r) => r[5] === "[not stated]")).toHaveLength(1);
  });

  it("prints the totals the report states", () => {
    expect(PRINTED_TOTAL[2569]?.amount).toBe("1988223.24");
    expect(PRINTED_TOTAL[2568]?.amount).toBe("1970599.50");
  });
});

describe("data dictionary counts", () => {
  it("counts rows per view and per organisation type", () => {
    expect(viewCounts(lines).map((v) => [v.view, v.year, v.rows])).toEqual([
      ["organisation", 2569, 8],
      ["organisation", 2568, 10],
      ["project", null, 19],
      ["category", null, 37],
      ["category-all", null, 17],
    ]);
    const types = typeCounts(lines);
    expect(types.reduce((sum, t) => sum + t.rows, 0)).toBe(91);
    expect(types[0]).toEqual({ type: "ชุมนุม", rows: 38 });
  });

  it("finds the smallest and largest amount", () => {
    expect(amountRange(lines)).toEqual({ min: "90.00", max: "1248164.50" });
    expect(amountRange([])).toBeNull();
  });

  it("writes page numbers as ranges", () => {
    expect(pageRanges([16, 5, 6, 8, 9, 10, 11, 12, 13, 14, 14], "to")).toBe("5, 6, 8 to 14, 16");
    expect(pageRanges([3], "to")).toBe("3");
  });
});

describe("funds list paging", () => {
  const funds: FundListRow[] = Array.from({ length: 60 }, (_, i) => ({
    number: i + 1,
    kind: i < 20 ? "income" : "spendable",
    code: String(40000 + i),
    name: "n",
  }));

  it("shows 25 a page and clamps the page", () => {
    const view = fundsView(funds, "", 1);
    expect(view).toMatchObject({ page: 1, totalPages: 3, from: 1, to: FUNDS_PAGE_SIZE, total: 60 });
    expect(fundsView(funds, "", 3)).toMatchObject({ from: 51, to: 60 });
    expect(fundsView(funds, "", 99).page).toBe(3);
    expect(fundsView(funds, "", 0).page).toBe(1);
  });

  it("filters by type before paging", () => {
    expect(fundsView(funds, "income", 1)).toMatchObject({ total: 20, totalPages: 1, from: 1, to: 20 });
    expect(fundsView(funds, "spendable", 2)).toMatchObject({ total: 40, from: 26, to: 40 });
    expect(fundsView([], "income", 1)).toMatchObject({ total: 0, from: 0, to: 0, totalPages: 1 });
  });

  it("builds addresses with no query for the plain first page", () => {
    expect(fundsHref("/en/x", "", 1)).toBe("/en/x");
    expect(fundsHref("/en/x", "income", 1)).toBe("/en/x?type=income");
    expect(fundsHref("/en/x", "", 3)).toBe("/en/x?page=3");
    expect(fundsHref("/en/x", "spendable", 2)).toBe("/en/x?type=spendable&page=2");
  });

  it("reads the query defensively", () => {
    expect(parseFundFilter("income")).toBe("income");
    expect(parseFundFilter("nonsense")).toBe("");
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });

  it("recognises the two types the list prints", () => {
    expect(fundKind("กองทุนจ่ายขาด")).toBe("spendable");
    expect(fundKind("ดอกผลกองทุนห้ามจ่ายขาดสำหรับเงินต้น")).toBe("income");
    expect(fundKind("อื่น")).toBe("other");
  });
});
