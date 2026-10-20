import { describe, expect, it } from "vitest";

/**
 * The importer reads the survey CSVs. Importing it needs the Sanity env vars
 * (lib/sanity/env.ts checks them at import time), so set placeholders first.
 * Nothing is sent anywhere: the module only runs its import when executed
 * directly.
 */
async function loadParser() {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= "test";
  process.env.NEXT_PUBLIC_SANITY_DATASET ??= "test";
  return (await import("@/sanity/seed/canteen")).parseCsv;
}

describe("survey CSV reader", () => {
  it("skips comment and blank lines and uses the first remaining line as the header", async () => {
    const parseCsv = await loadParser();
    const rows = parseCsv("# note\n\na,b\n# another\n1,2\n3,4\n");
    expect(rows).toEqual([
      { line: 5, cells: { a: "1", b: "2" } },
      { line: 6, cells: { a: "3", b: "4" } },
    ]);
  });

  it("handles quotes, commas, doubled quotes, line breaks in cells, CRLF and a BOM", async () => {
    const parseCsv = await loadParser();
    const rows = parseCsv('﻿name,note\r\n"Fixture, one","say ""hi"""\r\n"two","line\nbreak"\r\n');
    expect(rows.map((row) => row.cells)).toEqual([
      { name: "Fixture, one", note: 'say "hi"' },
      { name: "two", note: "line\nbreak" },
    ]);
  });

  it("a template with only a header and comments yields no rows", async () => {
    const parseCsv = await loadParser();
    const { readFileSync } = await import("node:fs");
    for (const file of ["canteen-stalls-template.csv", "canteen-survey-template.csv", "canteen-canonical-template.csv"]) {
      expect(parseCsv(readFileSync(`data/${file}`, "utf8"))).toEqual([]);
    }
  });
});

describe("2569 stall sheet", () => {
  it("gives the triangular kiosks their shape and size, matching the demo floor plan", async () => {
    const parseCsv = await loadParser();
    const { readFileSync } = await import("node:fs");
    const { demoCanteenData } = await import("@/lib/canteen/demo");
    const rows = parseCsv(readFileSync("data/canteen-stalls-2569.csv", "utf8"));
    const demo = demoCanteenData().stalls;
    for (const row of rows) {
      const cell = demo.find((stall) => stall.number === Number(row.cells.number))!.mapCell;
      expect(Number(row.cells.map_col)).toBe(cell.col);
      expect(Number(row.cells.map_row)).toBe(cell.row);
      expect(Number(row.cells.map_w)).toBe(cell.w);
      expect(Number(row.cells.map_h)).toBe(cell.h);
      expect(row.cells.map_shape || "rect").toBe(cell.shape ?? "rect");
    }
    expect(rows.find((row) => row.cells.number === "17")?.cells.map_shape).toBe("triangleBottomRight");
    expect(rows.find((row) => row.cells.number === "18")?.cells.map_shape).toBe("triangleBottomLeft");
  });
});
