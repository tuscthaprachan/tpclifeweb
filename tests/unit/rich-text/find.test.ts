import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { findMatches } from "@/components/admin/content/rich-text/find-replace";
import { richTextExtensions } from "@/lib/rich-text/tiptap";

const schema = getSchema(richTextExtensions());
const t = (text: string, ...marks: string[]) => ({ type: "text", text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const doc = schema.nodeFromJSON({
  type: "doc",
  content: [
    { type: "paragraph", content: [t("Cat and "), t("cat", "bold"), t("s, CAT")] },
    { type: "paragraph", content: [t("นักศึกษา นักศึกษา")] },
    { type: "codeBlock", content: [t("a cat()")] },
  ],
});

const slice = (m: { from: number; to: number }) => doc.textBetween(m.from, m.to);

describe("find matches", () => {
  it("ignores case by default and finds across mark boundaries", () => {
    const matches = findMatches(doc, "cat", false);
    expect(matches).toHaveLength(4);
    expect(matches.map(slice)).toEqual(["Cat", "cat", "CAT", "cat"]);
  });

  it("respects case when asked", () => {
    expect(findMatches(doc, "cat", true).map(slice)).toEqual(["cat", "cat"]);
  });

  it("finds a phrase that spans two text nodes", () => {
    expect(findMatches(doc, "and cat", false).map(slice)).toEqual(["and cat"]);
  });

  it("finds Thai text and nothing for an empty query", () => {
    expect(findMatches(doc, "นักศึกษา", false)).toHaveLength(2);
    expect(findMatches(doc, "", false)).toEqual([]);
  });
});
