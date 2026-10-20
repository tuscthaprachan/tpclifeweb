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
