import { describe, expect, it } from "vitest";
import { openDataDocumentRecords, openDataSectionRecords } from "@/lib/open-data/search";
import type { DocumentSummary } from "@/lib/open-data/read";

describe("open data search records", () => {
  it("indexes the landing page and every TUSC section under both locales", () => {
    const records = openDataSectionRecords({ documents: 49, meetings: 7, funds: 269 });
    expect(records).toHaveLength(12);
    expect(records[0]?.path).toEqual({ th: "/th/about/open-data", en: "/en/about/open-data" });
    expect(records.every((r) => r.type === "openDataPage" && r.weight > 0 && !r.summary.en.includes("{n}"))).toBe(true);
    expect(records.find((r) => r.id === "open-data-tusc-meetings")?.summary.en).toContain("7");
  });

  it("indexes each document by its page, with identifying facts in the haystack", () => {
    const doc = {
      id: "d1",
      number: "16",
      slug: "16-vehicle-entry",
      titleTh: "ประกาศ",
      titleEn: "Vehicle announcement",
      issuerTh: "มหาวิทยาลัย",
      issuerEn: "University",
      reference: null,
      dateText: "2555",
      dateIso: "2012-01-01",
    } as DocumentSummary;
    const [record] = openDataDocumentRecords([doc]);
    expect(record?.path.en).toBe("/en/about/open-data/tusc/documents/16-vehicle-entry");
    expect(record?.type).toBe("openDataDocument");
    expect(record?.haystack).toContain("Vehicle announcement");
  });
});
