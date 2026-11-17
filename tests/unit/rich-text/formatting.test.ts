import { getSchema } from "@tiptap/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RichText } from "@/components/domain/rich-text";
import { normaliseEditorDoc } from "@/lib/rich-text/editor";
import { parseRichTextDoc } from "@/lib/rich-text/schema";
import { richTextToPlainText } from "@/lib/rich-text/text";
import { richTextExtensions } from "@/lib/rich-text/tiptap";
import type { RichTextDoc } from "@/lib/rich-text/types";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => createElement("img", { src: props.src, alt: props.alt }),
}));

const schema = getSchema(richTextExtensions());
const t = (text: string, ...marks: string[]) => ({ type: "text", text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: unknown[]) => ({ type: "paragraph", ...(content.length ? { content } : {}) });
const cell = (type: string, text: string) => ({ type, content: [p(t(text))] });
const row = (...cells: unknown[]) => ({ type: "tableRow", content: cells });
const wrap = (...content: unknown[]) => ({ type: "doc", content });

const TABLE = { type: "table", content: [row(cell("tableHeader", "Name"), cell("tableHeader", "Hours")), row(cell("tableCell", "Desk"), cell("tableCell", "9 to 5"))] };

const DOC = wrap(
  p(t("a", "underline"), t("b", "strike"), t("c", "code")),
  { type: "codeBlock", attrs: { language: "ts" }, content: [t("let x = 1;\nlet y = 2;")] },
  { type: "horizontalRule" },
  TABLE,
);

describe("new formatting in the schema", () => {
  it("accepts every new node and mark", () => {
    expect(parseRichTextDoc(DOC)).toEqual(DOC);
  });

  it("survives the real editor schema", () => {
    const node = schema.nodeFromJSON(DOC);
    node.check();
    expect(parseRichTextDoc(normaliseEditorDoc(node.toJSON()))).toEqual(DOC);
  });

  it("strips what the table extension adds and rebuilds a rectangle", () => {
    const fromEditor = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            { type: "tableRow", content: [{ type: "tableHeader", attrs: { colspan: 2, rowspan: 1, colwidth: null }, content: [p(t("a"))] }] },
            { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [p(t("b"))] }, { type: "tableHeader", content: [p(t("c"))] }] },
          ],
        },
      ],
    };
    const doc = normaliseEditorDoc(fromEditor);
    expect(() => parseRichTextDoc(doc)).not.toThrow();
    const rows = doc.content[0]!.content!;
    expect(rows.map((r) => r.content!.map((c) => c.type))).toEqual([
      ["tableHeader", "tableHeader"],
      ["tableCell", "tableCell"],
    ]);
  });

  it("drops an empty language and keeps a real one", () => {
    const empty = normaliseEditorDoc({ type: "doc", content: [{ type: "codeBlock", attrs: { language: null }, content: [t("x")] }] });
    expect(empty.content[0]!.attrs).toBeUndefined();
    expect(parseRichTextDoc(empty).content[0]!.attrs).toBeUndefined();
  });

  it("lets code stand alone and orders other marks", () => {
    const doc = normaliseEditorDoc({ type: "doc", content: [p({ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "/a" } }, { type: "bold" }, { type: "code" }] }, { type: "text", text: "y", marks: [{ type: "link", attrs: { href: "/a" } }, { type: "bold" }] })] });
    expect(doc.content[0]!.content!.map((n) => n.marks!.map((m) => m.type))).toEqual([["code"], ["bold", "link"]]);
  });

  it.each([
    ["code with another mark", wrap(p({ ...t("x"), marks: [{ type: "code" }, { type: "bold" }] }))],
    ["a repeated mark", wrap(p({ ...t("x"), marks: [{ type: "bold" }, { type: "bold" }] }))],
    ["marks in a code block", wrap({ type: "codeBlock", content: [t("x", "bold")] })],
    ["a bad code language", wrap({ type: "codeBlock", attrs: { language: "a b" }, content: [t("x")] })],
    ["a ragged table", wrap({ type: "table", content: [row(cell("tableCell", "a"), cell("tableCell", "b")), row(cell("tableCell", "c"))] })],
    ["a header below the first row", wrap({ type: "table", content: [row(cell("tableCell", "a")), row(cell("tableHeader", "b"))] })],
    ["a half-header first row", wrap({ type: "table", content: [row(cell("tableHeader", "a"), cell("tableCell", "b"))] })],
    ["a table with no rows", wrap({ type: "table", content: [] })],
    ["a cell with two paragraphs", wrap({ type: "table", content: [row({ type: "tableCell", content: [p(t("a")), p(t("b"))] })] })],
    ["a table in a list", wrap({ type: "bulletList", content: [{ type: "listItem", content: [p(t("a")), { type: "table", content: [row(cell("tableCell", "a"))] }] }] })],
    ["a rule in a quote", wrap({ type: "blockquote", content: [{ type: "horizontalRule" }] })],
    ["a rule with content", wrap({ type: "horizontalRule", content: [t("x")] })],
    ["a code block holding a paragraph", wrap({ type: "codeBlock", content: [p(t("x"))] })],
  ])("rejects %s", (_name, doc) => {
    expect(() => parseRichTextDoc(doc)).toThrow();
  });
});

describe("new formatting rendered", () => {
  const render = (doc: RichTextDoc) => renderToStaticMarkup(createElement(RichText, { value: doc, locale: "en", headingLevel: 2 }));
  const html = render(parseRichTextDoc(DOC));

  it("renders marks", () => {
    expect(html).toContain("<u>a</u>");
    expect(html).toContain("<s>b</s>");
    expect(html).toMatch(/<code class="[^"]*">c<\/code>/);
  });

  it("renders a code block and a rule as plain elements", () => {
    expect(html).toMatch(/<pre[^>]*><code>let x = 1;\nlet y = 2;<\/code><\/pre>/);
    expect(html).toMatch(/<hr[^>]*\/?>/);
  });

  it("renders every table as a real table with header cells, never stacked", () => {
    expect(html).toMatch(/<th scope="col"[^>]*>Name<\/th>/);
    expect(html).not.toContain("data-label");
    expect(html).not.toContain("sm:table");
    expect(html).toContain("overflow-x-auto");
  });

  it("renders a table with no header row without labels", () => {
    const out = render(parseRichTextDoc(wrap({ type: "table", content: [row(cell("tableCell", "a"), cell("tableCell", "b"))] })));
    expect(out).not.toContain("<thead");
    expect(out).not.toContain("data-label");
    expect(out).toContain(">a<");
  });
});

describe("plain text", () => {
  it("includes code and table cells, kept apart", () => {
    expect(richTextToPlainText(parseRichTextDoc(DOC))).toBe("abc let x = 1; let y = 2; Name Hours Desk 9 to 5");
  });
});
