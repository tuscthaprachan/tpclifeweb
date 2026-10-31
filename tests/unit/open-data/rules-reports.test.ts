import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reportContents, ruleContents } from "@/components/domain/open-data/rules/contents";
import { RULE_GROUPS, RULE_NUMBERS, ruleDate, ruleStatus } from "@/components/domain/open-data/rules/rules";
import { sharedResponse, surveyFor, urgencyLabel, addresseeLabel } from "@/components/domain/open-data/reports/reports";
import { OPEN_DATA_DIR } from "@/lib/open-data/import";
import { parseMarkdown } from "@/lib/open-data/markdown";
import { parseFrontMatter } from "@/lib/open-data/parse";

const body = (n: string) => parseFrontMatter(readFileSync(`${OPEN_DATA_DIR}/transcripts/${n}.md`, "utf8")).body;

describe("ruleContents", () => {
  it("lists the nine chapters and the transitional provisions of the Thai regulation with their clauses", () => {
    const contents = ruleContents(body("26"));
    expect(contents.entries).toHaveLength(10);
    expect(contents.intro).toEqual({ id: "clause-1", first: 1, last: 4 });
    const meeting = contents.entries[1];
    expect(meeting?.label).toBe("หมวด 2 การประชุม");
    expect([meeting?.first, meeting?.last]).toEqual([8, 60]);
    expect(meeting?.children.map((c) => [c.first, c.last])).toEqual([
      [8, 26],
      [27, 43],
      [44, 53],
      [54, 60],
    ]);
    const last = contents.entries[9];
    expect([last?.first, last?.last]).toEqual([120, 121]);
  });

  it("gives the English translation the same shape", () => {
    const th = ruleContents(body("26"));
    const en = ruleContents(body("25"));
    expect(en.entries).toHaveLength(th.entries.length);
    expect(en.entries.map((e) => [e.first, e.last])).toEqual(th.entries.map((e) => [e.first, e.last]));
    expect(en.entries[1]?.label).toBe("Chapter 2 Meeting");
  });

  it("adds anchors without changing the text", () => {
    const original = body("26");
    const { markdown, entries } = ruleContents(original);
    expect(markdown.replace(/<a id="ch-\d+"><\/a>/g, "")).toBe(original.replace(/^﻿/, "").replace(/\r\n?/g, "\n"));
    const ids = parseMarkdown(markdown).flatMap((block) => (block.t === "heading" ? block.ids : []));
    for (const entry of entries) expect(ids).toContain(entry.id);
  });

  it("joins a bare chapter number to the title on the next line", () => {
    const contents = ruleContents("## หมวด ๑\n### องค์ประกอบ\n\n<a id=\"clause-1\"></a>**ข้อ ๑** ก\n");
    expect(contents.entries[0]?.label).toBe("หมวด ๑ องค์ประกอบ");
    expect(contents.entries[0]?.first).toBe(1);
  });

  it("finds no chapters in an announcement", () => {
    expect(ruleContents(body("15")).entries).toHaveLength(0);
  });
});

describe("reportContents", () => {
  it("lists the chapters of the canteen report with their sections and skips the contents page", () => {
    const { entries } = reportContents(body("47"), 2);
    const labels = entries.map((e) => e.label);
    expect(labels).toContain("บทที่ 1 บทนำ");
    expect(labels.some((l) => l.startsWith("สารบัญ"))).toBe(false);
    expect(entries.find((e) => e.label === "บทที่ 1 บทนำ")?.children.length).toBe(5);
  });
});

describe("rules", () => {
  it("covers the ten rules once each", () => {
    expect(RULE_NUMBERS).toHaveLength(10);
    expect(new Set(RULE_NUMBERS).size).toBe(10);
    expect(RULE_GROUPS.map((g) => g.numbers.length)).toEqual([2, 2, 1, 3, 2]);
  });

  it("shows a partial English date as the document gives it", () => {
    expect(ruleDate({ number: "18", dateText: null, dateIso: null }, "en")).toBe("[?] October 2020");
    expect(ruleDate({ number: "26", dateText: "19 มีนาคม พุทธศักราช 2569", dateIso: "2026-03-19" }, "en")).toBe("19 March 2026");
  });

  it("is in force unless replaced", () => {
    expect(ruleStatus({ replacedById: null })).toBe("in-force");
    expect(ruleStatus({ replacedById: "x" })).toBe("replaced");
  });
});

describe("report helpers", () => {
  const rec = (status: string | null) => ({ id: "1", reportDocumentSlug: "r", section: "4.1", textTh: "", textEn: "", addressedTo: null, urgency: null, responseStatus: status, responseDate: null });

  it("shares a response only when every recommendation has the same one", () => {
    expect(sharedResponse([rec("No response recorded"), rec("No response recorded")])).toBe("No response recorded");
    expect(sharedResponse([rec("No response recorded"), rec("Accepted")])).toBeNull();
    expect(sharedResponse([])).toBeNull();
  });

  it("orders survey rows by mentions, most first", () => {
    const row = (problemEn: string, mentions: number, reportDocumentSlug = "r") => ({ reportDocumentSlug, problemTh: problemEn, problemEn, mentions });
    expect(surveyFor([row("Other", 2), row("Seating", 150), row("Pigeons", 120), row("X", 9, "other")], "r").map((r) => r.problemEn)).toEqual(["Seating", "Pigeons", "Other"]);
  });

  it("gives stored values their Thai wording and passes unknown values through", () => {
    expect(urgencyLabel("urgent", "th")).toBe("เร่งด่วน");
    expect(urgencyLabel("urgent", "en")).toBe("Urgent");
    expect(urgencyLabel("something else", "en")).toBe("something else");
    expect(addresseeLabel("[not stated]", "th")).toBe("[ไม่ระบุ]");
    expect(addresseeLabel(null, "en")).toBe("[not stated]");
  });
});
