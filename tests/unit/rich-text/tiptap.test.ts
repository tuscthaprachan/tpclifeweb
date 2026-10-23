import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { BLOCK_DEFAULTS, normaliseEditorDoc, validateBlockAttrs } from "@/lib/rich-text/editor";
import { parseRichTextDoc, CUSTOM_NODES } from "@/lib/rich-text/schema";
import { richTextExtensions } from "@/lib/rich-text/tiptap";

const schema = getSchema(richTextExtensions());

/** What the editor's `getJSON()` returns for a document: through the real ProseMirror schema and back. */
function throughEditor(json: unknown) {
  const node = schema.nodeFromJSON(json);
  node.check();
  return node.toJSON();
}

const th = (t: string) => ({ th: t, en: `${t} (en)` });

const FULL_DOC = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Plain " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " italic", marks: [{ type: "italic" }, { type: "bold" }] },
        { type: "hardBreak" },
        { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://example.com/x" } }] },
      ],
    },
    { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "Deep" }] },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "two" }] },
            {
              type: "orderedList",
              content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] }],
            },
          ],
        },
      ],
    },
    { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] },
    { type: "contactBlock", attrs: { label: th("Line"), channel: "line", value: "@tusu", hours: th("9 to 5") } },
    { type: "formCallout", attrs: { formId: "f1" } },
    { type: "image", attrs: { imageId: "i1", isDecorative: false, alt: th("Alt"), caption: th("Cap") } },
    { type: "image", attrs: { imageId: "i2", isDecorative: true } },
    { type: "linkOut", attrs: { label: th("Out"), url: "https://example.com", description: th("d"), requiresSignIn: true } },
    { type: "calloutBox", attrs: { tone: "warning", title: th("T"), body: th("B") } },
    { type: "stepList", attrs: { title: th("Steps"), steps: [{ title: th("S1"), detail: th("D1") }, { title: th("S2") }] } },
  ],
};

describe("TipTap vocabulary", () => {
  it("round-trips every node and mark through the editor schema and the stored schema", () => {
    const produced = throughEditor(FULL_DOC);
    const stored = parseRichTextDoc(normaliseEditorDoc(produced));
    expect(stored.content.map((n) => n.type)).toEqual(FULL_DOC.content.map((n) => n.type));
    expect(stored.content.find((n) => n.type === "contactBlock")?.attrs).toEqual(FULL_DOC.content[6]?.attrs);
    expect(stored.content.find((n) => n.type === "stepList")?.attrs).toEqual(FULL_DOC.content[12]?.attrs);
    expect(stored.content[1]?.content?.[4]?.marks).toEqual([{ type: "link", attrs: { href: "https://example.com/x" } }]);
  });

  it("strips editor-only attrs and nulls so the stored schema accepts them", () => {
    const produced = throughEditor({
      type: "doc",
      content: [
        { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] }] },
        { type: "paragraph", content: [{ type: "text", text: "l", marks: [{ type: "link", attrs: { href: "/news", target: "_blank", rel: "noopener", class: null } }] }] },
        { type: "image", attrs: { imageId: "i", isDecorative: false, alt: th("a"), caption: null } },
      ],
    });
    expect(() => parseRichTextDoc(produced)).toThrow();
    const clean = parseRichTextDoc(normaliseEditorDoc(produced));
    expect(clean.content[0]?.attrs).toBeUndefined();
    expect(clean.content[2]?.attrs).toEqual({ imageId: "i", isDecorative: false, alt: th("a") });
  });

  it("gives an empty document for a blank editor", () => {
    const blank = throughEditor({ type: "doc", content: [{ type: "paragraph" }] });
    expect(parseRichTextDoc(normaliseEditorDoc(blank))).toEqual({ type: "doc", content: [] });
  });

  it("refuses structures the stored schema refuses, at the editor schema", () => {
    const heading = { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "h" }] };
    expect(() => throughEditor({ type: "doc", content: [{ type: "blockquote", content: [heading] }] })).toThrow();
    expect(() =>
      throughEditor({ type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }, heading] }] }] }),
    ).toThrow();
    expect(() => throughEditor({ type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "h" }] }] })).not.toThrow();
  });

  it("has no strike, code, underline or rule in the schema", () => {
    for (const name of ["strike", "code", "underline", "codeBlock", "horizontalRule"]) {
      expect(schema.nodes[name] ?? schema.marks[name]).toBeUndefined();
    }
  });

  it("defines all six custom blocks as atoms", () => {
    for (const name of CUSTOM_NODES) {
      expect(schema.nodes[name]?.isAtom).toBe(true);
      expect(Object.keys(schema.nodes[name]!.spec.attrs ?? {}).sort()).toEqual(Object.keys(BLOCK_DEFAULTS[name]).sort());
    }
  });
});

describe("validateBlockAttrs", () => {
  it("accepts a valid block and explains an invalid one", () => {
    expect(validateBlockAttrs("formCallout", { formId: "x" })).toBeNull();
    expect(validateBlockAttrs("image", { imageId: "x", isDecorative: false, alt: th("") })).toMatch(/alt text/);
    expect(validateBlockAttrs("linkOut", { label: th("a"), url: "javascript:alert(1)", requiresSignIn: false })).toMatch(/link/i);
    expect(validateBlockAttrs("contactBlock", { label: th("a"), channel: "phone", value: "" })).not.toBeNull();
  });
});
