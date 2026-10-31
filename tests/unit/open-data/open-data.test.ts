import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { count, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import type { PgTable } from "drizzle-orm/pg-core";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import {
  openDataBodies,
  openDataBudgetLines,
  openDataDecisions,
  openDataDocuments,
  openDataFunds,
  openDataMeetings,
  openDataMemberships,
  openDataPeople,
  openDataRecommendations,
  openDataSurveyResults,
} from "@/lib/db/schema";
import { seedOpenData } from "@/lib/db/seed/open-data";
import { OPEN_DATA_DIR, importOpenData } from "@/lib/open-data/import";
import { parseCsv, parseFrontMatter } from "@/lib/open-data/parse";
import {
  readBudgetLines,
  readDecisions,
  readDocument,
  readDocuments,
  readFunds,
  readMeetings,
  readMemberships,
  readRecommendations,
  readSurveyResults,
} from "@/lib/open-data/read";
import { sniffType, validateUpload } from "@/lib/storage/validate";
import { createTestDb } from "../db/harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
const rows = (name: string) => parseCsv(readFileSync(`${OPEN_DATA_DIR}/tables/${name}`, "utf8"));

async function total(table: PgTable): Promise<number> {
  const [r] = await ctx.db.select({ n: count() }).from(table);
  return r?.n ?? -1;
}

beforeAll(async () => {
  ctx = await createTestDb();
});
afterAll(async () => {
  await ctx.client.close();
});

describe("parsers", () => {
  it("reads blank, quoted and bracketed front matter values", () => {
    const { fields, body } = parseFrontMatter('---\nsource: 01.pdf\nreference:\ntitle_th: "a: b"\nnote: \'it\'\'s\'\nissuer_en: [none printed]\n---\n\nbody\n---\nmore');
    expect(fields).toEqual({ source: "01.pdf", reference: "", title_th: "a: b", note: "it's", issuer_en: "[none printed]" });
    expect(body).toBe("\nbody\n---\nmore");
  });

  it("reads quoted CSV fields with commas, quotes and a byte order mark", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n,\r\n')).toEqual([
      { a: "x, y", b: 'say "hi"' },
      { a: "", b: "" },
    ]);
  });
});

describe("storage document profile", () => {
  it("accepts PDFs and CSVs and refuses markup and images", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(validateUpload(enc("%PDF-1.7 x"), "document").ok).toBe(true);
    expect(validateUpload(enc("a,b\n1,2\n"), "document", "text/csv; charset=utf-8")).toMatchObject({ ok: true, extension: "csv" });
    expect(sniffType(enc("<html>a,b</html>"))).toBeNull();
    expect(validateUpload(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), "document")).toEqual({ ok: false, code: "unsupported_type" });
  });
});

describe("open data import", () => {
  it("matches the source files and is idempotent", async () => {
    const first = await importOpenData(ctx.db);
    const expected = {
      documents: 49,
      funds: 269,
      decisions: 38,
      meetings: rows("meetings-attendance.csv").length,
      memberships: rows("people-members-and-roles.csv").length + rows("council-members.csv").length,
      budgetLines: rows("budget-lines.csv").length,
      recommendations: rows("canteen-recommendations.csv").length,
      surveyResults: rows("canteen-survey.csv").length,
    };
    expect(first).toMatchObject(expected);
    expect(first.people).toBe(
      new Set([...rows("people-members-and-roles.csv").map((r) => r.person), ...rows("council-members.csv").map((r) => r.name)]).size,
    );
    expect(rows("council-members.csv")).toHaveLength(30);
    expect(first.bodies).toBeGreaterThanOrEqual(rows("committees.csv").length + 1);

    expect(await total(openDataDocuments)).toBe(49);
    expect(await total(openDataFunds)).toBe(rows("university-funds.csv").length);
    expect(await total(openDataDecisions)).toBe(rows("decisions.csv").length);
    expect(await total(openDataMeetings)).toBe(7);
    expect(await total(openDataMemberships)).toBe(expected.memberships);
    expect(await total(openDataPeople)).toBe(first.people);
    expect(await total(openDataBodies)).toBe(first.bodies);
    expect(await total(openDataBudgetLines)).toBe(91);
    expect(await total(openDataRecommendations)).toBe(expected.recommendations);
    expect(await total(openDataSurveyResults)).toBe(6);

    const second = await importOpenData(ctx.db);
    expect(Object.values(second).every((n) => n === 0)).toBe(true);
    expect(await seedOpenData(ctx.db)).toBe(0);
    expect(await total(openDataDocuments)).toBe(49);
    expect(await total(openDataMemberships)).toBe(expected.memberships);
  });

  it("keeps every transcript unchanged", async () => {
    const docs = await ctx.db.select().from(openDataDocuments);
    for (const doc of docs) {
      const { body } = parseFrontMatter(readFileSync(`${OPEN_DATA_DIR}/transcripts/${doc.number}.md`, "utf8"));
      expect(doc.transcriptMarkdown, doc.number).toBe(body);
    }
    const first = docs.find((d) => d.number === "01");
    expect(first?.transcriptMarkdown).toContain('<a id="part-1"></a>');
  });

  it("links drafts to the signed minutes and meetings to their documents", async () => {
    const docs = await readDocuments(ctx.db, "tusc");
    const byNumber = new Map(docs.map((d) => [d.number, d]));
    expect(byNumber.get("28")?.replacedById).toBe(byNumber.get("41")?.id);
    expect(byNumber.get("29")?.replacedById).toBe(byNumber.get("42")?.id);
    const full = await readDocument(ctx.db, "tusc", byNumber.get("28")!.slug);
    expect(full?.replacedBySlug).toBe(byNumber.get("41")?.slug);
    expect(await readDocument(ctx.db, "tusc", "nope")).toBeNull();

    const meetings = await readMeetings(ctx.db, "tusc");
    expect(meetings.map((m) => m.minutesDocumentSlug)).not.toContain(null);
    expect(meetings.find((m) => m.meetingDate === "2026-01-08")?.agendaDocumentSlug).toBe(byNumber.get("27")?.slug);
    expect(meetings.find((m) => m.meetingDate === "2026-03-19")?.minutesAdoptedOn).toBeNull();
  });

  it("serves values as published and by owner", async () => {
    const decisions = await readDecisions(ctx.db, "tusc");
    expect(decisions).toHaveLength(38);
    const source = rows("decisions.csv");
    expect(decisions.map((d) => d.votesFor).sort()).toEqual(source.map((r) => r.votes_for).sort());
    expect(await readFunds(ctx.db, "tusc")).toHaveLength(269);
    expect(await readFunds(ctx.db, "tusu")).toHaveLength(0);
    expect((await readBudgetLines(ctx.db, "tusc", 2569)).every((l) => l.fiscalYear === 2569)).toBe(true);
    const lines = await readBudgetLines(ctx.db, "tusc");
    expect(lines.map((l) => l.amount).sort()).toEqual(rows("budget-lines.csv").map((r) => r.amount_thb).sort());
    expect((await readRecommendations(ctx.db, "tusc"))[0]?.textEn).toBe(rows("canteen-recommendations.csv")[0]?.recommendation_en);
    expect((await readSurveyResults(ctx.db, "tusc")).map((s) => s.mentions)).toEqual([2, 6, 35, 40, 120, 150]);
    expect(await readMemberships(ctx.db, "tusc")).toHaveLength(149);
  });

  it("refuses an owner outside tusc and tusu", async () => {
    await expect(
      ctx.db.execute(`insert into open_data_funds (owner, number, type, code, name) values ('joint', 9999, 'a', 'b', 'c')` as never),
    ).rejects.toThrow();
    const [row] = await ctx.db.select().from(openDataFunds).where(eq(openDataFunds.number, 1));
    expect(row?.owner).toBe("tusc");
  });
});
