import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  agendaItems,
  groupBySession,
  meetingDocuments,
  meetingHeader,
  meetingLabel,
  nestAgenda,
  outcomeTone,
  printedValue,
} from "@/components/domain/open-data/meetings/meetings";
import { decisionQueryString, filterDecisions, paginateDecisions, parseDecisionQuery, sortDecisions } from "@/components/domain/open-data/meetings/decision-query";
import type { DecisionRow, DocumentSummary, MeetingRow } from "@/lib/open-data/read";

function minutes(file: string): string {
  return readFileSync(`data/open-data/tusc/transcripts/${file}.md`, "utf8").replace(/^---[\s\S]*?\n---\n/, "");
}

function meeting(partial: Partial<MeetingRow>): MeetingRow {
  return {
    id: "m",
    slug: "s",
    sessionType: "ordinary",
    session: 1,
    meeting: 1,
    titleTh: "",
    academicYear: 2568,
    meetingDate: "2026-01-01",
    place: null,
    chair: null,
    seats: 30,
    present: 17,
    onLeave: 0,
    absent: 0,
    minutesAdoptedOn: null,
    minutesDocumentSlug: null,
    agendaDocumentSlug: null,
    ...partial,
  };
}

function decision(partial: Partial<DecisionRow>): DecisionRow {
  return {
    id: "d",
    ref: "D01",
    meetingSlug: "a",
    meetingDate: "2026-01-01",
    item: "1",
    topic: "other",
    type: "motion",
    textTh: "",
    textEn: "",
    votesFor: null,
    votesAgainst: null,
    votesAbstain: null,
    membersVoting: null,
    partyBreakdown: null,
    outcome: "approved",
    amount: null,
    minutesAnchor: null,
    ...partial,
  };
}

describe("meeting labels and grouping", () => {
  it("names a meeting by session and number in both languages", () => {
    const m = meeting({ sessionType: "extraordinary", session: 2, meeting: 1 });
    expect(meetingLabel(m, "en")).toBe("Extraordinary Session 2, Meeting 1");
    expect(meetingLabel(m, "th")).toBe("สมัยวิสามัญ 2 ครั้งที่ 1");
  });

  it("groups by session, newest session and meeting first", () => {
    const groups = groupBySession([
      meeting({ slug: "a", sessionType: "extraordinary", session: 1, meetingDate: "2025-05-13" }),
      meeting({ slug: "b", sessionType: "extraordinary", session: 1, meetingDate: "2025-05-26" }),
      meeting({ slug: "c", sessionType: "ordinary", session: 2, meetingDate: "2026-01-08" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["ordinary-2-2568", "extraordinary-1-2568"]);
    expect(groups[1]?.meetings.map((m) => m.slug)).toEqual(["b", "a"]);
  });
});

describe("minutes header and agenda", () => {
  it("reads the printed date, place and scheduled time", () => {
    const header = meetingHeader(minutes("45"));
    expect(header.dateLine).toContain("8 มกราคม 2569");
    expect(header.placeLine).toMatch(/^ณ /);
    expect(header.time).toBe("16:30");
  });

  it("reads a header written as headings", () => {
    const header = meetingHeader(minutes("39"));
    expect(header.dateLine).toContain("13 พฤษภาคม 2568");
    expect(header.time).toBe("17:00");
  });

  it("lists agenda sections and items from the anchors, with items nested under their section", () => {
    const items = agendaItems(minutes("45"));
    expect(items.map((item) => item.id)).toEqual(["item-1", "item-2", "item-3", "item-3-1", "item-3-2", "item-4", "item-5", "item-6", "item-6-1", "item-6-2", "item-6-3", "item-7", "item-8"]);
    const nested = nestAgenda(items);
    expect(nested).toHaveLength(8);
    expect(nested[2]?.children.map((child) => child.id)).toEqual(["item-3-1", "item-3-2"]);
  });

  it("finds an anchor for every decision in its minutes", () => {
    const rows = readFileSync("data/open-data/tusc/tables/decisions.csv", "utf8").split("\n").slice(1).filter(Boolean);
    for (const row of rows) {
      const cells = row.split(",");
      const file = row.match(/(\d+)\.md/)?.[1];
      const anchor = cells[6];
      if (file && anchor) expect(minutes(file)).toContain(`<a id="${anchor}">`);
    }
  });
});

describe("meetingDocuments", () => {
  it("returns minutes, agenda, papers filed with the meeting and earlier versions", () => {
    const doc = (id: string, slug: string, extra: Partial<DocumentSummary> = {}) =>
      ({ id, slug, driveFolderPath: "x", replacedById: null, ...extra }) as DocumentSummary;
    const docs = [
      doc("1", "minutes"),
      doc("2", "agenda"),
      doc("3", "paper", { driveFolderPath: "a/การประชุมสภานักศึกษาฯ ท่าพระจันทร์ สมัยสามัญ 2 ครั้งที่ 1/b" }),
      doc("4", "draft", { replacedById: "1" }),
      doc("5", "other"),
    ];
    const m = meeting({ titleTh: "สมัยสามัญ 2 ครั้งที่ 1", minutesDocumentSlug: "minutes", agendaDocumentSlug: "agenda" });
    expect(meetingDocuments(m, docs).map((d) => d.slug)).toEqual(["minutes", "agenda", "paper", "draft"]);
  });
});

describe("decision register helpers", () => {
  const rows = [
    decision({ id: "1", ref: "D01", meetingSlug: "a", meetingDate: "2025-05-13", topic: "appointments" }),
    decision({ id: "2", ref: "D02", meetingSlug: "a", meetingDate: "2025-05-13", topic: "budget", outcome: "noted" }),
    decision({ id: "3", ref: "D03", meetingSlug: "b", meetingDate: "2026-01-08", topic: "appointments" }),
  ];

  it("ignores unknown filter values and bad page numbers", () => {
    expect(parseDecisionQuery({ topic: "nonsense", outcome: "noted", meeting: "zzz", page: "-3" }, ["a", "b"])).toEqual({
      topic: "",
      outcome: "noted",
      meeting: "",
      page: 1,
    });
  });

  it("sorts latest meeting first and keeps register order inside a meeting", () => {
    expect(sortDecisions(rows).map((r) => r.ref)).toEqual(["D03", "D01", "D02"]);
  });

  it("filters by topic, outcome and meeting together", () => {
    const query = { topic: "appointments", outcome: "", meeting: "a", page: 1 };
    expect(filterDecisions(rows, query).map((r) => r.ref)).toEqual(["D01"]);
    expect(filterDecisions(rows, { topic: "", outcome: "noted", meeting: "", page: 1 }).map((r) => r.ref)).toEqual(["D02"]);
  });

  it("pages the list and clamps the page", () => {
    const list = Array.from({ length: 38 }, (_, i) => decision({ id: String(i), ref: `D${i}` }));
    const first = paginateDecisions(list, 1);
    expect([first.pages, first.rows.length, first.from, first.to]).toEqual([2, 24, 1, 24]);
    const clamped = paginateDecisions(list, 9);
    expect([clamped.page, clamped.rows.length, clamped.from, clamped.to]).toEqual([2, 14, 25, 38]);
    expect(paginateDecisions([], 1)).toMatchObject({ pages: 1, total: 0, from: 0, to: 0 });
  });

  it("builds a query string with only the filters that are set", () => {
    expect(decisionQueryString({ topic: "budget", outcome: "", meeting: "" }, 2)).toBe("?topic=budget&page=2");
    expect(decisionQueryString({ topic: "", outcome: "", meeting: "" }, 1)).toBe("");
  });

  it("shows printed vote values and localises the placeholders", () => {
    expect(printedValue("16", "en")).toBe("16");
    expect(printedValue("[no vote]", "th")).toBe("[ไม่มีการลงมติ]");
    expect(printedValue(null, "en")).toBe("[not stated]");
    expect(outcomeTone("deferred")).toBe("warning");
  });
});
