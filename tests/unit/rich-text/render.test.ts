// The old renderer's import chain reads Sanity env at load time.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= "test";
  process.env.NEXT_PUBLIC_SANITY_DATASET ??= "test";
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PortableTextRenderer } from "@/components/domain/portable-text";
import { RichText } from "@/components/domain/rich-text";
import { portableTextToDoc } from "@/lib/rich-text/convert";
import type { RichTextDoc } from "@/lib/rich-text/types";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => createElement("img", { src: props.src, alt: props.alt }),
}));

const span = (text: string, marks: string[] = []) => ({ _type: "span", _key: text, text, marks });
const block = (text: string, extra: Record<string, unknown> = {}) => ({
  _type: "block",
  _key: text,
  style: "normal",
  markDefs: [],
  children: [span(text)],
  ...extra,
});
const ls = (en: string) => ({ _type: "localeString", th: `ไทย ${en}`, en });

function both(pt: unknown[], headingLevel: 2 | 3 | 4 = 2, locale: "th" | "en" = "en") {
  const oldHtml = renderToStaticMarkup(createElement(PortableTextRenderer, { value: pt as never, locale, headingLevel }));
  const newHtml = renderToStaticMarkup(createElement(RichText, { value: portableTextToDoc(pt), locale, headingLevel }));
  return { oldHtml, newHtml };
}

describe("RichText matches PortableTextRenderer", () => {
  it("plain blocks, headings, lists and quotes", () => {
    const pt = [
      block("H2", { style: "h2" }),
      block("H3", { style: "h3" }),
      block("H4", { style: "h4" }),
      block("Para"),
      block("Quote", { style: "blockquote" }),
      block("a", { listItem: "bullet", level: 1 }),
      block("b", { listItem: "bullet", level: 1 }),
      block("one", { listItem: "number", level: 1 }),
      block("two", { listItem: "number", level: 1 }),
    ];
    for (const level of [2, 3, 4] as const) {
      const { oldHtml, newHtml } = both(pt, level);
      expect(newHtml).toBe(oldHtml);
    }
  });

  it("strong and em", () => {
    const pt = [{ ...block("x"), children: [span("plain "), span("bold", ["strong"]), span("it", ["em"])] }];
    const { oldHtml, newHtml } = both(pt);
    expect(newHtml).toBe(oldHtml);
    expect(newHtml).toContain("<strong>bold</strong>");
  });

  it("never lets body content produce an h1", () => {
    const { newHtml } = both([block("H2", { style: "h2" })], 2);
    expect(newHtml).not.toContain("<h1");
    expect(newHtml).toContain("<h2");
  });

  it("contact, link out, callout and step list blocks", () => {
    const pt = [
      { _type: "contactBlock", _key: "c", label: ls("Desk"), channel: "email", value: "a@b.co", hours: ls("9-5") },
      { _type: "contactBlock", _key: "c2", label: ls("Room"), channel: "inPerson", value: "W101" },
      { _type: "linkOut", _key: "l", label: ls("Go"), url: "https://example.com", description: ls("desc"), requiresSignIn: true },
      { _type: "calloutBox", _key: "b", tone: "warning", title: ls("T"), body: ls("Body") },
      { _type: "stepList", _key: "s", title: ls("How"), steps: [{ _key: "1", title: ls("One"), detail: ls("d") }, { _key: "2", title: ls("Two") }] },
    ];
    for (const locale of ["en", "th"] as const) {
      const { oldHtml, newHtml } = both(pt, 3, locale);
      expect(newHtml).toBe(oldHtml);
    }
  });
});

describe("RichText", () => {
  it("renders nested lists", () => {
    const html = renderToStaticMarkup(
      createElement(RichText, {
        locale: "en",
        headingLevel: 2,
        value: portableTextToDoc([
          block("top", { listItem: "bullet", level: 1 }),
          block("child", { listItem: "number", level: 2 }),
        ]),
      }),
    );
    expect(html).toMatch(/<ul[^>]*><li>top<ol[^>]*><li>child<\/li><\/ol><\/li><\/ul>/);
  });

  it("renders link marks through the shared Link", () => {
    const value: RichTextDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "site", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }],
    };
    const html = renderToStaticMarkup(createElement(RichText, { value, locale: "en", headingLevel: 2 }));
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("noopener");
  });

  it("escapes text rather than injecting markup", () => {
    const value: RichTextDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] };
    const html = renderToStaticMarkup(createElement(RichText, { value, locale: "en", headingLevel: 2 }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders images and form callouts from resolved data, and nothing when missing", () => {
    const value: RichTextDoc = {
      type: "doc",
      content: [
        { type: "image", attrs: { imageId: "i1", isDecorative: false, alt: { th: "ก", en: "A cat" }, caption: { th: "ข", en: "Cap" } } },
        { type: "formCallout", attrs: { formId: "f1" } },
        { type: "formCallout", attrs: { formId: "gone" } },
      ],
    };
    const resolved = {
      images: new Map([["i1", { url: "https://blob.example/cat.jpg" }]]),
      forms: new Map([
        ["f1", { id: "f1", slug: "report", title: { th: "ก", en: "Report it" }, purpose: { th: "ข", en: "Tell us" }, requiresSignIn: false, isActive: true }],
      ]),
    };
    const html = renderToStaticMarkup(createElement(RichText, { value, locale: "en", headingLevel: 2, resolved }));
    expect(html).toContain('alt="A cat"');
    expect(html).toContain("Cap");
    expect(html).toContain("/en/forms/report");
    expect(html).toContain("<h2");
    expect(html).not.toContain("gone");
    const without = renderToStaticMarkup(createElement(RichText, { value, locale: "en", headingLevel: 2 }));
    expect(without).not.toContain("<img");
  });

  it("renders nothing for an empty or missing document", () => {
    expect(renderToStaticMarkup(createElement(RichText, { value: null, locale: "en", headingLevel: 2 }))).toBe("");
    expect(renderToStaticMarkup(createElement(RichText, { value: { type: "doc", content: [] }, locale: "en", headingLevel: 2 }))).toBe("");
  });
});
