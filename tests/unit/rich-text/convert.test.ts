import { beforeAll, describe, expect, it } from "vitest";

import { portableTextToDoc } from "@/lib/rich-text/convert";
import { parseRichTextDoc } from "@/lib/rich-text/schema";
import { findPortableText, loadSeedDocs } from "./helpers";

const span = (text: string, marks: string[] = []) => ({ _type: "span", _key: text, text, marks });
const block = (children: unknown[], extra: Record<string, unknown> = {}) => ({
  _type: "block",
  _key: "k",
  style: "normal",
  markDefs: [],
  children,
  ...extra,
});
const li = (text: string, listItem: "bullet" | "number", level = 1) => block([span(text)], { listItem, level });

describe("portableTextToDoc: seed content", () => {
  let fields: ReturnType<typeof findPortableText>;

  beforeAll(async () => {
    fields = findPortableText(await loadSeedDocs());
  }, 30_000);

  it("finds the seeded Portable Text fields", () => {
    // 16 FAQs x2 languages, 12 handbook pages x2, plus the hand-built guide pages.
    expect(fields.length).toBeGreaterThan(50);
  });

  it("converts every seeded field to a document parseRichTextDoc accepts", () => {
    for (const { where, blocks } of fields) {
      const doc = portableTextToDoc(blocks);
      expect(() => parseRichTextDoc(doc), where).not.toThrow();
      expect(doc.content.length, where).toBeGreaterThan(0);
    }
  });

  it("round-trips text content", () => {
    const text = (nodes: unknown): string =>
      JSON.stringify(nodes).match(/"text":"((?:[^"\\]|\\.)*)"/g)?.join("") ?? "";
    for (const { blocks } of fields.slice(0, 20)) {
      const source = JSON.stringify(blocks).match(/"text":"((?:[^"\\]|\\.)*)"/g)?.join("");
      expect(text(portableTextToDoc(blocks))).toBe(source);
    }
  });
});

describe("portableTextToDoc: constructs", () => {
  it("maps styles to paragraph, heading and blockquote", () => {
    const doc = portableTextToDoc([
      block([span("p")]),
      block([span("h2")], { style: "h2" }),
      block([span("h4")], { style: "h4" }),
      block([span("q")], { style: "blockquote" }),
    ]);
    expect(doc.content.map((n) => n.type)).toEqual(["paragraph", "heading", "heading", "blockquote"]);
    expect(doc.content[1]!.attrs).toEqual({ level: 2 });
    expect(doc.content[2]!.attrs).toEqual({ level: 4 });
    expect(doc.content[3]!.content![0]!.type).toBe("paragraph");
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("maps decorators and link annotations to marks", () => {
    const doc = portableTextToDoc([
      block([span("a ", []), span("b", ["strong", "em"]), span("c", ["L1"])], {
        markDefs: [{ _type: "link", _key: "L1", href: "https://example.com/x" }],
      }),
    ]);
    const [a, b, c] = doc.content[0]!.content!;
    expect(a!.marks).toBeUndefined();
    expect(b!.marks).toEqual([{ type: "bold" }, { type: "italic" }]);
    expect(c!.marks).toEqual([{ type: "link", attrs: { href: "https://example.com/x" } }]);
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("turns newlines into hardBreak and drops empty spans", () => {
    const doc = portableTextToDoc([block([span("one\ntwo"), span("")])]);
    expect(doc.content[0]!.content!.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });

  it("keeps an empty block as an empty paragraph", () => {
    const doc = portableTextToDoc([block([span("")])]);
    expect(doc.content).toEqual([{ type: "paragraph" }]);
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("groups consecutive list items and splits on type change", () => {
    const doc = portableTextToDoc([li("a", "bullet"), li("b", "bullet"), li("c", "number"), block([span("after")])]);
    expect(doc.content.map((n) => n.type)).toEqual(["bulletList", "orderedList", "paragraph"]);
    expect(doc.content[0]!.content).toHaveLength(2);
  });

  it("nests deeper levels inside the previous item and returns to the outer list", () => {
    const doc = portableTextToDoc([
      li("1", "bullet"),
      li("1.1", "number", 2),
      li("1.2", "number", 2),
      li("1.2.1", "bullet", 3),
      li("2", "bullet"),
    ]);
    expect(doc.content).toHaveLength(1);
    const outer = doc.content[0]!;
    expect(outer.type).toBe("bulletList");
    expect(outer.content).toHaveLength(2);
    const firstItem = outer.content![0]!;
    expect(firstItem.content!.map((n) => n.type)).toEqual(["paragraph", "orderedList"]);
    const inner = firstItem.content![1]!;
    expect(inner.content).toHaveLength(2);
    expect(inner.content![1]!.content!.map((n) => n.type)).toEqual(["paragraph", "bulletList"]);
    expect(outer.content![1]!.content!.map((n) => n.type)).toEqual(["paragraph"]);
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("handles a first list item that claims a deep level", () => {
    const doc = portableTextToDoc([li("a", "bullet", 3), li("b", "bullet", 1)]);
    expect(doc.content.map((n) => n.type)).toEqual(["bulletList", "bulletList"]);
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("converts all six custom blocks", () => {
    const ls = (en: string) => ({ _type: "localeString", th: `th ${en}`, en });
    const doc = portableTextToDoc(
      [
        { _type: "siteImage", _key: "1", asset: { _ref: "image-abc" }, isDecorative: false, alt: ls("alt"), caption: ls("cap") },
        { _type: "formCallout", _key: "2", form: { _ref: "form-1" } },
        { _type: "linkOut", _key: "3", label: ls("go"), url: "https://example.com", requiresSignIn: true },
        { _type: "calloutBox", _key: "4", tone: "warning", title: ls("t"), body: ls("b") },
        { _type: "stepList", _key: "5", title: ls("s"), steps: [{ _key: "a", title: ls("one"), detail: ls("d") }, { _key: "b", title: ls("two") }] },
        { _type: "contactBlock", _key: "6", label: ls("c"), channel: "email", value: "a@b.co", hours: ls("h") },
      ],
      { mapImageId: (id) => `img:${id}`, mapFormId: (id) => `frm:${id}` },
    );
    expect(doc.content.map((n) => n.type)).toEqual(["image", "formCallout", "linkOut", "calloutBox", "stepList", "contactBlock"]);
    expect(doc.content[0]!.attrs!.imageId).toBe("img:image-abc");
    expect(doc.content[1]!.attrs).toEqual({ formId: "frm:form-1" });
    expect(() => parseRichTextDoc(doc)).not.toThrow();
  });

  it("throws, naming the block, on unsupported input", () => {
    expect(() => portableTextToDoc([{ _type: "mystery", _key: "zz" }])).toThrow(/mystery/);
    expect(() => portableTextToDoc([block([span("x")], { style: "h1" })])).toThrow(/h1/);
    expect(() => portableTextToDoc([block([span("x", ["underline"])])])).toThrow(/underline/);
    expect(() =>
      portableTextToDoc([block([span("x", ["m"])], { markDefs: [{ _type: "comment", _key: "m" }] })]),
    ).toThrow(/comment/);
    expect(() => portableTextToDoc([block([span("x")], { listItem: "square", level: 1 })])).toThrow(/square/);
  });

  it("treats undefined as an empty document", () => {
    expect(portableTextToDoc(undefined)).toEqual({ type: "doc", content: [] });
  });
});
