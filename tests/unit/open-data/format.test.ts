import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyAmount } from "@/components/domain/open-data/money";
import { academicYearLabel, fiscalYearLabel } from "@/components/domain/open-data/years";
import { groupDocuments } from "@/components/domain/open-data/documents";
import type { DocumentSummary } from "@/lib/open-data/read";

describe("formatMoney", () => {
  it("always shows two decimals and the unit", () => {
    expect(formatMoney(1988223.24, "en")).toBe("1,988,223.24 baht");
    expect(formatMoney(1988223.24, "th")).toBe("1,988,223.24 บาท");
    expect(formatMoney(9182, "en")).toBe("9,182.00 baht");
    expect(formatMoney("857", "th")).toBe("857.00 บาท");
  });

  it("does not round a published figure to whole baht", () => {
    expect(formatMoneyAmount("1171383.84", "en")).toBe("1,171,383.84");
    expect(formatMoneyAmount("0.5", "th")).toBe("0.50");
  });

  it("returns an unreadable value as it came", () => {
    expect(formatMoneyAmount("[not stated]", "en")).toBe("[not stated]");
  });
});

describe("year labels", () => {
  it("writes the academic year", () => {
    expect(academicYearLabel(2568, "th")).toBe("ปีการศึกษา 2568");
    expect(academicYearLabel(2568, "en")).toBe("academic year 2568 (2025 to 2026)");
    expect(academicYearLabel(2568, "en", { capital: true })).toBe("Academic year 2568 (2025 to 2026)");
  });

  it("writes the fiscal year", () => {
    expect(fiscalYearLabel(2569, "th")).toBe("ปีงบประมาณ 2569");
    expect(fiscalYearLabel(2569, "en")).toBe("FY 2569 (2026)");
  });
});

function doc(number: string, driveFolderPath: string): DocumentSummary {
  return { number, slug: `d-${number}`, driveFolderPath } as DocumentSummary;
}

describe("groupDocuments", () => {
  const docs = [
    doc("01", "1. ประกาศต่าง ๆ/1. ประกาศแต่งตั้งตราครุฑ"),
    doc("02", "1. ประกาศต่าง ๆ/1. ประกาศแต่งตั้งตราครุฑ"),
    doc("16", "1. ประกาศต่าง ๆ"),
    doc("17", "2. บัญชีรายชื่อสมาชิกสภานักศึกษา "),
    doc("39", "6. รายงานการประชุม/สมัยวิสามัญ 1/2568/สมัยวิสามัญ1_ครั้งที่1"),
    doc("40", "6. รายงานการประชุม/สมัยวิสามัญ 1/2568/สมัยวิสามัญ1_ครั้งที่2"),
    doc("49", "อื่น ๆ"),
  ];

  it("groups by top folder in Drive order with the main folder's own files last", () => {
    const groups = groupDocuments(docs, "en");
    expect(groups.map((g) => [g.title, g.count])).toEqual([
      ["1. Announcements", 3],
      ["2. List of Student Council members", 1],
      ["6. Minutes of meetings", 2],
      ["Other", 1],
    ]);
    expect(groups[0]?.sections.map((s) => s.heading)).toEqual(["1. Appointments announced by the university (Garuda seal)", "Files in the main folder"]);
  });

  it("puts every meeting of a session under one heading", () => {
    const minutes = groupDocuments(docs, "en")[2];
    expect(minutes?.sections).toHaveLength(1);
    expect(minutes?.sections[0]?.heading).toBe("Extraordinary Session 1, 2568");
  });

  it("keeps the Drive names in Thai and gives a folder with no subfolders no heading", () => {
    const groups = groupDocuments(docs, "th");
    expect(groups[0]?.title).toBe("1. ประกาศต่าง ๆ");
    expect(groups[1]?.sections[0]?.heading).toBeNull();
  });
});
