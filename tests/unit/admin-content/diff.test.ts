import { describe, expect, it } from "vitest";
import { diffSequences, diffSnapshots, diffWords, restorableRow, richTextParagraphs } from "@/lib/admin/content/diff";
import { checkSchedule, isLive, scheduleState } from "@/lib/admin/content/schedule";

const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
});

describe("richTextParagraphs", () => {
  it("returns one entry per text block, including list items and markers for atoms", () => {
    const value = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }, { type: "text", text: " two", marks: [{ type: "bold" }] }] }] }] },
        { type: "formCard", attrs: { formId: "abc" } },
      ],
    };
    expect(richTextParagraphs(value)).toEqual(["Hello", "One two", "[formCard: formId=abc]"]);
  });

  it("is empty for anything that is not a document", () => {
    expect(richTextParagraphs(null)).toEqual([]);
    expect(richTextParagraphs({ foo: 1 })).toEqual([]);
  });
});

describe("diffSequences and diffWords", () => {
  it("marks inserted and removed lines and keeps the common ones", () => {
    expect(diffSequences(["a", "b", "c"], ["a", "c", "d"])).toEqual([
      { type: "same", text: "a" },
      { type: "remove", text: "b" },
      { type: "same", text: "c" },
      { type: "add", text: "d" },
    ]);
  });

  it("diffs words and joins runs of the same kind", () => {
    const ops = diffWords("the quick fox", "the slow fox");
    expect(ops.filter((o) => o.type === "remove").map((o) => o.text)).toEqual(["quick"]);
    expect(ops.filter((o) => o.type === "add").map((o) => o.text)).toEqual(["slow"]);
    expect(ops.map((o) => o.text).join("")).toContain("the ");
  });

  it("handles empty sides", () => {
    expect(diffWords("", "new")).toEqual([{ type: "add", text: "new" }]);
    expect(diffWords("old", "")).toEqual([{ type: "remove", text: "old" }]);
  });
});

describe("diffSnapshots", () => {
  const before = {
    row: { id: "1", slug: "a", titleTh: "ก", titleEn: "Hello world", bodyTh: doc("หนึ่ง"), bodyEn: doc("One", "Two"), status: "draft", updatedAt: "x" },
    tags: [{ id: "t", position: 0, labelTh: "ก", labelEn: "a" }],
  };
  const after = {
    row: { id: "1", slug: "b", titleTh: "ก", titleEn: "Hello there", bodyTh: doc("หนึ่ง"), bodyEn: doc("One", "Three"), status: "published", updatedAt: "y" },
    tags: [{ id: "t", position: 0, labelTh: "ก", labelEn: "a" }, { id: "u", position: 1, labelTh: "ข", labelEn: "b" }],
  };
  const diff = diffSnapshots(before, after);
  const field = (key: string) => diff.fields.find((f) => f.key === key)!;

  it("pairs Thai and English columns into one two-sided field and ignores housekeeping columns", () => {
    expect(field("title").sides.map((s) => s.locale)).toEqual(["th", "en"]);
    expect(field("title").changed).toBe(true);
    expect(field("title").sides[0]!.changed).toBe(false);
    expect(diff.fields.some((f) => ["id", "updatedAt"].includes(f.key))).toBe(false);
  });

  it("compares rich text as paragraphs", () => {
    const body = field("body");
    expect(body.kind).toBe("richText");
    expect(body.sides[0]!.changed).toBe(false);
    expect(body.sides[1]!.ops).toEqual([
      { type: "same", text: "One" },
      { type: "remove", text: "Two" },
      { type: "add", text: "Three" },
    ]);
  });

  it("compares child rows as lists without their ids or positions", () => {
    const tags = field("tags");
    expect(tags.kind).toBe("list");
    expect(tags.sides[0]!.ops).toEqual([
      { type: "same", text: "ก | a" },
      { type: "add", text: "ข | b" },
    ]);
  });

  it("counts changed fields and reports identical snapshots as unchanged", () => {
    expect(diff.changedCount).toBe(5);
    expect(diffSnapshots(before, before).changedCount).toBe(0);
  });

  it("treats a missing earlier snapshot as everything added", () => {
    const first = diffSnapshots(undefined, after);
    expect(first.fields.find((f) => f.key === "slug")!.sides[0]!.ops).toEqual([{ type: "add", text: "b" }]);
  });
});

describe("restorableRow", () => {
  it("drops housekeeping columns and returns null for a deletion record without a row", () => {
    expect(restorableRow({ row: { id: "1", slug: "a", createdBy: "u", titleEn: "T" } })).toEqual({ slug: "a", titleEn: "T" });
    expect(restorableRow({ deleted: true })).toBeNull();
  });
});

describe("scheduleState", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const row = (status: string, publishAt: string | null, unpublishAt: string | null) => ({ status, publishAt, unpublishAt });

  it("names each phase of the window", () => {
    expect(scheduleState(row("draft", null, null), now)).toBe("draft");
    expect(scheduleState(row("published", null, null), now)).toBe("live");
    expect(scheduleState(row("published", "2026-06-01T11:59:00Z", null), now)).toBe("live");
    expect(scheduleState(row("published", "2026-06-02T00:00:00Z", null), now)).toBe("scheduled");
    expect(scheduleState(row("published", null, "2026-06-01T12:00:00Z"), now)).toBe("expired");
    expect(scheduleState(row("published", null, "2026-06-03T00:00:00Z"), now)).toBe("live");
    expect(isLive(row("published", "2026-06-02T00:00:00Z", null), now)).toBe(false);
  });

  it("refuses an end before the start, or an end in the past", () => {
    const d = (s: string) => new Date(s);
    expect(checkSchedule(d("2026-06-05T00:00:00Z"), d("2026-06-04T00:00:00Z"), now)).toBe("unpublishBeforePublish");
    expect(checkSchedule(null, d("2026-05-01T00:00:00Z"), now)).toBe("unpublishInPast");
    expect(checkSchedule(d("2026-06-05T00:00:00Z"), d("2026-06-06T00:00:00Z"), now)).toBeNull();
    expect(checkSchedule(null, null, now)).toBeNull();
  });
});
