import { describe, expect, it } from "vitest";

import { collectRichTextRefs, isSafeHref, parseRichTextDoc } from "@/lib/rich-text/schema";

const para = (text: string, marks?: unknown[]) => ({ type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] });
const doc = (...content: unknown[]) => ({ type: "doc", content });
const link = (href: string) => [{ type: "link", attrs: { href } }];
const ls = { th: "ก", en: "a" };

describe("isSafeHref", () => {
  it.each(["https://example.com", "http://example.com/a?b=1", "mailto:a@b.co", "tel:+66123456", "/th/forms", "/", "#top"])(
    "accepts %s",
    (href) => expect(isSafeHref(href)).toBe(true),
  );
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "//evil.example",
    "/\\evil.example",
    "ftp://example.com",
    "example.com",
    "",
  ])("rejects %j", (href) => expect(isSafeHref(href)).toBe(false));
});

describe("parseRichTextDoc", () => {
  it("accepts a document using every node and mark", () => {
    const input = doc(
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "H" }] },
      para("x", [{ type: "bold" }, { type: "italic" }, ...link("/th/news")]),
      { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] },
      { type: "blockquote", content: [para("q")] },
      { type: "bulletList", content: [{ type: "listItem", content: [para("i"), { type: "orderedList", content: [{ type: "listItem", content: [para("n")] }] }] }] },
      { type: "image", attrs: { imageId: "i1", isDecorative: false, alt: ls } },
      { type: "formCallout", attrs: { formId: "f1" } },
      { type: "linkOut", attrs: { label: ls, url: "https://example.com", requiresSignIn: false } },
      { type: "calloutBox", attrs: { tone: "info", body: ls } },
      { type: "stepList", attrs: { steps: [{ title: ls }] } },
      { type: "contactBlock", attrs: { label: ls, channel: "phone", value: "02 613 3333" } },
    );
    expect(parseRichTextDoc(input)).toMatchObject({ type: "doc" });
  });

  it("accepts TipTap's link defaults and strips them", () => {
    const out = parseRichTextDoc(doc(para("x", [{ type: "link", attrs: { href: "https://a.co", target: "_blank", rel: "noopener", class: null } }])));
    expect(out.content[0]!.content![0]!.marks).toEqual([{ type: "link", attrs: { href: "https://a.co" } }]);
  });

  it("rejects unsafe link hrefs in marks and blocks", () => {
    expect(() => parseRichTextDoc(doc(para("x", link("javascript:alert(1)"))))).toThrow(/Unsafe/);
    expect(() => parseRichTextDoc(doc({ type: "linkOut", attrs: { label: ls, url: "data:text/html,x" } }))).toThrow();
    expect(() => parseRichTextDoc(doc({ type: "contactBlock", attrs: { label: ls, channel: "url", value: "javascript:x" } }))).toThrow();
  });

  it("rejects unknown nodes and marks", () => {
    expect(() => parseRichTextDoc(doc({ type: "script", content: [] }))).toThrow(/unknown node "script"/);
    expect(() => parseRichTextDoc(doc({ type: "codeBlock", content: [] }))).toThrow(/unknown node/);
    expect(() => parseRichTextDoc(doc(para("x", [{ type: "underline" }])))).toThrow(/unknown mark "underline"/);
  });

  it("rejects bad structure", () => {
    expect(() => parseRichTextDoc({ type: "paragraph" })).toThrow(/root/);
    expect(() => parseRichTextDoc(doc({ type: "text", text: "loose" }))).toThrow(/not allowed inside "doc"/);
    expect(() => parseRichTextDoc(doc({ type: "heading", attrs: { level: 1 }, content: [] }))).toThrow(/level/);
    expect(() => parseRichTextDoc(doc({ type: "heading", content: [] }))).toThrow();
    expect(() => parseRichTextDoc(doc({ type: "bulletList", content: [] }))).toThrow(/at least one item/);
    expect(() => parseRichTextDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "bulletList", content: [] }] }] }))).toThrow();
    expect(() => parseRichTextDoc(doc({ type: "paragraph", content: [{ type: "text", text: "" }] }))).toThrow(/non-empty/);
    expect(() => parseRichTextDoc(doc({ type: "paragraph", onclick: "x" }))).toThrow(/unexpected field/);
    expect(() => parseRichTextDoc(doc({ type: "image", attrs: { imageId: "i" } }))).toThrow(/alt/);
    expect(() => parseRichTextDoc(doc({ type: "calloutBox", attrs: { tone: "loud", body: ls } }))).toThrow();
  });

  it("rejects absurd nesting", () => {
    let node: unknown = para("deep");
    for (let i = 0; i < 20; i++) node = { type: "blockquote", content: [node] };
    expect(() => parseRichTextDoc(doc(node))).toThrow();
  });
});

describe("collectRichTextRefs", () => {
  it("lists distinct form and image ids", () => {
    const refs = collectRichTextRefs({
      type: "doc",
      content: [
        { type: "formCallout", attrs: { formId: "f1" } },
        { type: "formCallout", attrs: { formId: "f1" } },
        { type: "image", attrs: { imageId: "i1" } },
        { type: "paragraph" },
      ],
    });
    expect(refs).toEqual({ formIds: ["f1"], imageIds: ["i1"] });
  });
});
