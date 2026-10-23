import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
