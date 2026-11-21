import { describe, expect, it } from "vitest";
import { validateBlockAttrs } from "@/lib/rich-text/editor";
import { docToMarkdown, markdownToDoc } from "@/lib/rich-text/markdown";
import { parseRichTextDoc, RichTextError } from "@/lib/rich-text/schema";

const item = (startsAt: string, endsAt: string) => ({ startsAt, endsAt, label: { th: "ช่วง", en: "Stage" }, detail: { th: "ถนน", en: "Roads" } });

describe("liveTimeline block", () => {
  it("accepts stages with real times and round-trips through Markdown", () => {
    const doc = parseRichTextDoc({
      type: "doc",
      content: [{ type: "liveTimeline", attrs: { title: { th: "กำหนดการ", en: "Schedule" }, items: [item("2026-11-21T23:45:00.000Z", "2026-11-22T01:00:00.000Z")] } }],
    });
    expect(markdownToDoc(docToMarkdown(doc))).toEqual(doc);
  });

  it("refuses a stage that ends before it starts", () => {
    expect(() =>
      parseRichTextDoc({ type: "doc", content: [{ type: "liveTimeline", attrs: { items: [item("2026-11-22T01:00:00Z", "2026-11-21T23:45:00Z")] } }] }),
    ).toThrow(RichTextError);
  });

  it("refuses a time without a zone and an empty list", () => {
    expect(validateBlockAttrs("liveTimeline", { items: [item("2026-11-22T06:45", "2026-11-22T08:00")] })).not.toBeNull();
    expect(validateBlockAttrs("liveTimeline", { items: [] })).not.toBeNull();
  });
});
