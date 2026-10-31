import { describe, expect, it } from "vitest";
import { bodyTypeLabel, roleLabel } from "@/components/domain/open-data/people/labels";
import {
  bodiesWithMembers,
  citedDocuments,
  groupByPerson,
  isMarkerText,
  membershipsOfBody,
  roleRank,
  seatsByParty,
  sourceNumbers,
} from "@/components/domain/open-data/people/model";
import type { BodyRow, DocumentSummary, MembershipRow } from "@/lib/open-data/read";

function membership(over: Partial<MembershipRow>): MembershipRow {
  return {
    personId: "p1",
    personNameTh: "ก",
    personNameLatin: null,
    faculty: null,
    party: null,
    bodySlug: "b1",
    bodyNameTh: "ข",
    roleTh: "กรรมาธิการ",
    fromDate: null,
    toDate: null,
    sourceDocumentSlug: null,
    sourceDocuments: null,
    sourceAnchor: null,
    ...over,
  };
}

describe("markers and sources", () => {
  it("recognises bracketed markers and blanks", () => {
    expect(isMarkerText("[not stated]")).toBe(true);
    expect(isMarkerText(null)).toBe(true);
    expect(isMarkerText("Renew TPC")).toBe(false);
  });

  it("splits printed source numbers and drops markers", () => {
    expect(sourceNumbers("02;45")).toEqual(["02", "45"]);
    expect(sourceNumbers("[not stated]")).toEqual([]);
    expect(sourceNumbers(null)).toEqual([]);
  });
});

describe("ordering", () => {
  it("puts the chair before vice-chairs and members", () => {
    expect(roleRank("ประธานคณะกรรมาธิการ")).toBeLessThan(roleRank("รองประธาน คนที่ 1"));
    expect(roleRank("รองประธาน")).toBeLessThan(roleRank("กรรมาธิการ"));
    const rows = [
      membership({ personId: "a", personNameTh: "ข", roleTh: "กรรมาธิการ" }),
      membership({ personId: "b", personNameTh: "ก", roleTh: "ประธานคณะกรรมาธิการ" }),
    ];
    expect(membershipsOfBody(rows, "b1").map((m) => m.personId)).toEqual(["b", "a"]);
  });
});

describe("grouping", () => {
  it("groups memberships by person and keeps only bodies with members", () => {
    const rows = [membership({ personId: "a" }), membership({ personId: "a", bodySlug: "b2" }), membership({ personId: "b", personNameTh: "ข" })];
    expect(groupByPerson(rows).map((p) => [p.personId, p.memberships.length])).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    const bodies = [{ slug: "b1" }, { slug: "b2" }, { slug: "empty" }] as BodyRow[];
    expect(bodiesWithMembers(bodies, rows).map((b) => b.slug)).toEqual(["b1", "b2"]);
  });

  it("lists each cited document once", () => {
    const docs = [{ id: "1", number: "02", slug: "d02" }, { id: "2", number: "45", slug: "d45" }] as DocumentSummary[];
    const cited = citedDocuments([membership({ sourceDocuments: "02;45" }), membership({ sourceDocuments: "02", sourceDocumentSlug: "d02" })], docs);
    expect(cited.map((d) => d.number)).toEqual(["02", "45"]);
  });
});

describe("labels", () => {
  it("uses Vice-President on the executive committee and Vice-chair elsewhere", () => {
    expect(roleLabel("รองประธาน คนที่ 1", "en", "executive-committee").text).toBe("1st Vice-President");
    expect(roleLabel("รองประธาน คนที่ 1", "en", "politics-and-democracy-committee").text).toBe("1st Vice-chair");
  });

  it("keeps the Thai text as printed in the Thai view and when no English is held", () => {
    expect(roleLabel("กรรมาธิการ", "th")).toEqual({ text: "กรรมาธิการ", thai: true });
    expect(roleLabel("ตำแหน่งอื่น", "en")).toEqual({ text: "ตำแหน่งอื่น", thai: true });
  });

  it("falls back to the kind when a body has no printed type", () => {
    expect(bodyTypeLabel({ committeeType: null, kind: "office" }, "en")).toBe("Office");
    expect(bodyTypeLabel({ committeeType: "Standing committee", kind: "committee" }, "th")).toBe("คณะกรรมาธิการสามัญ");
  });
});

describe("seatsByParty", () => {
  it("counts members per party, most seats first, with unnamed parties together", () => {
    const rows = [{ party: "ReLife" }, { party: "Renew TPC" }, { party: "Renew TPC" }, { party: "[not stated]" }];
    expect(seatsByParty(rows)).toEqual([
      { party: "Renew TPC", seats: 2 },
      { party: "", seats: 1 },
      { party: "ReLife", seats: 1 },
    ]);
  });
});
