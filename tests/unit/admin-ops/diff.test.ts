import { describe, expect, it } from "vitest";
import { diffRecords, flatten, formatDiffValue } from "@/lib/admin/audit/diff";

describe("audit diff", () => {
  it("lists only changed fields", () => {
    const rows = diffRecords({ title: "A", status: "draft", n: 1 }, { title: "A", status: "published", n: 1 });
    expect(rows).toEqual([{ path: "status", kind: "changed", before: "draft", after: "published" }]);
  });

  it("treats a missing before as a creation and a missing after as a deletion", () => {
    expect(diffRecords(null, { a: 1, b: "x" }).map((r) => [r.path, r.kind])).toEqual([["a", "added"], ["b", "added"]]);
    expect(diffRecords({ a: 1 }, undefined).map((r) => [r.path, r.kind, r.before])).toEqual([["a", "removed", "1"]]);
  });

  it("flattens nested objects and arrays to dotted paths", () => {
    expect([...flatten({ a: { b: [1, { c: 2 }] }, e: {} }).entries()]).toEqual([
      ["a.b.0", 1],
      ["a.b.1.c", 2],
      ["e", {}],
    ]);
    const rows = diffRecords({ roles: ["admin"], name: { th: "ก", en: "A" } }, { roles: ["admin", "editor"], name: { th: "ก", en: "B" } });
    expect(rows.map((r) => [r.path, r.kind])).toEqual([["name.en", "changed"], ["roles.1", "added"]]);
  });

  it("detects added and removed keys and null changes", () => {
    const rows = diffRecords({ a: null, gone: 1 }, { a: "x", fresh: true });
    expect(rows).toEqual([
      { path: "a", kind: "changed", before: "null", after: "x" },
      { path: "fresh", kind: "added", before: null, after: "true" },
      { path: "gone", kind: "removed", before: "1", after: null },
    ]);
  });

  it("returns nothing for identical or empty input", () => {
    expect(diffRecords({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diffRecords(null, null)).toEqual([]);
  });

  it("cuts very long values", () => {
    expect(formatDiffValue("x".repeat(1000)).length).toBe(403);
    expect(formatDiffValue(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
  });
});
