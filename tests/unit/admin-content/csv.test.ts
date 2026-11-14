import { describe, expect, it, vi } from "vitest";
import { CSV_BOM, csvCell, csvRow, safeCell, toCsv } from "@/lib/admin/content/csv";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
const { EXPORT_HEADER, exportCells } = await import("@/lib/admin/content/export");

describe("csv", () => {
  it("quotes commas, quotes, newlines and edge spaces, and leaves plain text alone", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("line one\r\nline two")).toBe('"line one\r\nline two"');
    expect(csvCell(" padded")).toBe('" padded"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(7)).toBe("7");
  });

  it("keeps Thai text as it is", () => {
    expect(csvCell("ข่าวประชาสัมพันธ์, ปีการศึกษา 2569")).toBe('"ข่าวประชาสัมพันธ์, ปีการศึกษา 2569"');
    expect(csvCell("ข่าว")).toBe("ข่าว");
  });

  it("neutralises text a spreadsheet would run as a formula", () => {
    expect(safeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(safeCell("@home")).toBe("'@home");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("Normal")).toBe("Normal");
  });

  it("starts with a byte order mark and ends rows with CRLF", () => {
    const text = toCsv(["a", "b"], [["1", "x,y"], ["2", 'q"']]);
    expect(text.startsWith(CSV_BOM)).toBe(true);
    expect(text.slice(1)).toBe('a,b\r\n1,"x,y"\r\n2,"q"""\r\n');
    expect(csvRow(["a", "b"])).toBe("a,b");
  });
});

describe("exportCells", () => {
  const row = { id: "i1", title: { th: "ข่าว, หนึ่ง", en: 'News "one"' }, status: "published", updatedAt: new Date("2026-03-01T10:00:00Z"), updatedByName: "Ploy", slug: "news-one" };

  it("lists id, both titles, slug, status, time, editor and the public address", () => {
    expect(EXPORT_HEADER).toEqual(["id", "title_th", "title_en", "slug", "status", "updated_at", "updated_by", "public_url"]);
    expect(exportCells({ viewPath: "/news" }, row, "en", "https://example.test")).toEqual([
      "i1",
      "ข่าว, หนึ่ง",
      'News "one"',
      "news-one",
      "published",
      "2026-03-01T10:00:00.000Z",
      "Ploy",
      "https://example.test/en/news/news-one",
    ]);
  });

  it("leaves the address empty for a draft or a type with no public page", () => {
    expect(exportCells({ viewPath: "/news" }, { ...row, status: "draft" }, "en", "https://example.test")[7]).toBe("");
    expect(exportCells({}, row, "en", "https://example.test")[7]).toBe("");
  });
});
