import { describe, expect, it } from "vitest";
import { normaliseEditorDoc } from "@/lib/rich-text/editor";
import { docToMarkdown, markdownToDoc, MarkdownError } from "@/lib/rich-text/markdown";
import { parseRichTextDoc, RichTextError } from "@/lib/rich-text/schema";
import type { RichTextDoc, RichTextMark, RichTextNode } from "@/lib/rich-text/types";

const t = (text: string, ...marks: Array<string | RichTextMark>): RichTextNode => ({
  type: "text",
  text,
  ...(marks.length ? { marks: marks.map((m) => (typeof m === "string" ? { type: m } : m)) } : {}),
});
const p = (...content: RichTextNode[]): RichTextNode => ({ type: "paragraph", ...(content.length ? { content } : {}) });
const li = (...content: RichTextNode[]): RichTextNode => ({ type: "listItem", content });
const link = (href: string): RichTextMark => ({ type: "link", attrs: { href } });
const bi = (th: string) => ({ th, en: `${th} (en)` });
const cell = (type: "tableCell" | "tableHeader", ...content: RichTextNode[]): RichTextNode => ({ type, content: [p(...content)] });

function doc(...content: RichTextNode[]): RichTextDoc {
  return parseRichTextDoc(normaliseEditorDoc({ type: "doc", content }));
}

function roundTrip(d: RichTextDoc): RichTextDoc {
  return markdownToDoc(docToMarkdown(d));
}

function expectRoundTrip(d: RichTextDoc) {
  const md = docToMarkdown(d);
  expect(markdownToDoc(md), md).toEqual(d);
  expect(docToMarkdown(markdownToDoc(md))).toBe(md);
}

describe("markdown round trip: text", () => {
  it("paragraphs and every heading level", () => {
    expectRoundTrip(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Heading two")] },
        p(t("A paragraph.")),
        { type: "heading", attrs: { level: 3 }, content: [t("Heading three")] },
        { type: "heading", attrs: { level: 4 }, content: [t("Heading four")] },
        p(t("Another.")),
      ),
    );
  });

  it("each mark alone", () => {
    for (const mark of ["bold", "italic", "underline", "strike"]) {
      expectRoundTrip(doc(p(t("before "), t("marked", mark), t(" after"))));
    }
    expectRoundTrip(doc(p(t("use "), t("npm run build", "code"), t(" now"))));
    expectRoundTrip(doc(p(t("see "), t("the page", link("https://example.com/a?b=1&c=2")), t("."))));
  });

  it("combined and overlapping marks", () => {
    expectRoundTrip(doc(p(t("all", "bold", "italic", "underline", "strike"))));
    expectRoundTrip(doc(p(t("a ", "bold"), t("b", "bold", "italic"), t("c", "italic"))));
    expectRoundTrip(doc(p(t("bold", "bold"), t("both", "bold", "italic"), t("italic", "italic"))));
    expectRoundTrip(doc(p(t("a", "bold", "italic"), t("b", "italic"))));
    expectRoundTrip(doc(p(t("linked bold", "bold", link("https://example.com")), t(" and plain "), t("linked", link("/en/news")))));
  });

  it("links with awkward targets", () => {
    for (const href of ["https://example.com/a_(b)", "mailto:a@b.co", "tel:+66123456", "/th/news#top", "https://example.com/ไทย?q=ก"]) {
      expectRoundTrip(doc(p(t("go", link(href)))));
    }
  });

  it("line breaks, in paragraphs, headings and cells", () => {
    expectRoundTrip(doc(p(t("one"), { type: "hardBreak" }, t("two"))));
    expectRoundTrip(doc({ type: "heading", attrs: { level: 2 }, content: [t("a"), { type: "hardBreak" }, t("b")] }));
    expectRoundTrip(doc({ type: "table", content: [{ type: "tableRow", content: [cell("tableCell", t("a"), { type: "hardBreak" }, t("b"))] }] }));
  });

  it("characters Markdown would read as syntax", () => {
    const risky = [
      "2 * 3 * 4",
      "snake_case_name and _x_",
      "<b>not html</b> & &amp; &#65;",
      "1. not a list",
      "# not a heading",
      "- not a bullet",
      "> not a quote",
      "+ plus ++ double +++",
      "~~not struck~~ and ~tilde~",
      "[not](a link) and ![img](x)",
      "back\\slash and `tick`",
      "::image{not a block}",
      ":::fence",
      "---",
      "===",
      "| pipe |",
      "คำไทย ที่มี * และ _ ปะปน",
    ];
    for (const text of risky) expectRoundTrip(doc(p(t(text))));
  });

  it("code spans with backticks and padding", () => {
    expectRoundTrip(doc(p(t("a`b", "code"))));
    expectRoundTrip(doc(p(t("`edge`", "code"))));
    expectRoundTrip(doc(p(t(" spaced ", "code"))));
    expectRoundTrip(doc(p(t("``", "code"), t(" and "), t("x", "code"))));
  });

  it("Thai text with marks", () => {
    expectRoundTrip(doc(p(t("สวัสดี"), t("ตัวหนา", "bold"), t("และ"), t("ลิงก์", link("https://www.tu.ac.th")), t("จบ"))));
  });
});

describe("markdown round trip: structure", () => {
  it("bullet and ordered lists, nested, with line breaks", () => {
    expectRoundTrip(
      doc(
        {
          type: "bulletList",
          content: [
            li(p(t("one"))),
            li(p(t("two", "bold"), { type: "hardBreak" }, t("more")), {
              type: "orderedList",
              content: [li(p(t("nested a"))), li(p(t("nested b")), { type: "bulletList", content: [li(p(t("deep")))] })],
            }),
          ],
        },
        { type: "orderedList", content: Array.from({ length: 11 }, (_, i) => li(p(t(`item ${i + 1}`)))) },
      ),
    );
  });

  it("adjacent lists stay separate", () => {
    expectRoundTrip(doc({ type: "bulletList", content: [li(p(t("a")))] }, { type: "bulletList", content: [li(p(t("b")))] }));
    expectRoundTrip(doc({ type: "orderedList", content: [li(p(t("a")))] }, { type: "orderedList", content: [li(p(t("b")))] }));
  });

  it("blockquotes with paragraphs and lists", () => {
    expectRoundTrip(
      doc(
        { type: "blockquote", content: [p(t("quoted", "italic"), t(" text")), p(t("second")), { type: "bulletList", content: [li(p(t("in quote")))] }] },
        p(t("after")),
      ),
    );
  });

  it("code blocks, with and without a language", () => {
    const code = { type: "codeBlock", content: [t("const a = 1;\n\n  if (a) {\n    run();\n  }")] };
    expectRoundTrip(doc(code, { ...code, attrs: { language: "ts" } }));
    expectRoundTrip(doc({ type: "codeBlock", attrs: { language: "text" }, content: [t("```\nfence inside\n```")] }));
    expectRoundTrip(doc({ type: "codeBlock", content: [t("# not a heading\n- not a list")] }));
    expectRoundTrip(doc({ type: "codeBlock" }));
    expectRoundTrip(doc({ type: "codeBlock", content: [t("ends with newline\n")] }));
    expectRoundTrip(doc({ type: "codeBlock", content: [t("::image{x=1}")] }));
  });

  it("horizontal rules", () => {
    expectRoundTrip(doc(p(t("above")), { type: "horizontalRule" }, p(t("below")), { type: "horizontalRule" }));
  });

  it("tables with a header row", () => {
    expectRoundTrip(
      doc({
        type: "table",
        content: [
          { type: "tableRow", content: [cell("tableHeader", t("Name")), cell("tableHeader", t("Hours", "bold")), cell("tableHeader", t("ที่ตั้ง"))] },
          { type: "tableRow", content: [cell("tableCell", t("Desk")), cell("tableCell", t("9 | 5")), cell("tableCell", t("a", link("https://example.com")), t(" b"))] },
          { type: "tableRow", content: [cell("tableCell"), cell("tableCell", t("code", "code")), cell("tableCell", t("x", "italic"))] },
        ],
      }),
    );
  });

  it("tables with no header row", () => {
    expectRoundTrip(
      doc({
        type: "table",
        content: [
          { type: "tableRow", content: [cell("tableCell", t("a")), cell("tableCell", t("b"))] },
          { type: "tableRow", content: [cell("tableCell", t("c")), cell("tableCell", t("d"))] },
        ],
      }),
    );
  });

  it("a header-only table", () => {
    expectRoundTrip(doc({ type: "table", content: [{ type: "tableRow", content: [cell("tableHeader", t("Only")), cell("tableHeader", t("Head"))] }] }));
  });
});

describe("markdown round trip: custom blocks", () => {
  const blocks: RichTextNode[] = [
    { type: "image", attrs: { imageId: "img-1", isDecorative: false, alt: bi("Alt"), caption: bi('A "quoted" caption\nwith a line') } },
    { type: "image", attrs: { imageId: "img-2", isDecorative: true } },
    { type: "formCallout", attrs: { formId: "form-9" } },
    { type: "linkOut", attrs: { label: bi("Open"), url: "https://example.com/x?y=1", description: bi("Details"), requiresSignIn: true } },
    { type: "linkOut", attrs: { label: bi("Plain"), url: "/th/forms", requiresSignIn: false } },
    { type: "calloutBox", attrs: { tone: "warning", title: bi("Careful"), body: { th: "ระวัง \\ \"quotes\" } {", en: "Mind { braces } and = signs" } } },
    { type: "calloutBox", attrs: { tone: "critical", body: bi("No title") } },
    {
      type: "stepList",
      attrs: { title: bi("Steps"), steps: [{ title: bi("First"), detail: bi("Do it") }, { title: bi("Second") }, { title: { th: "สาม", en: "Third" }, detail: bi("d") }] },
    },
    { type: "contactBlock", attrs: { label: bi("Line"), channel: "line", value: "@tusu", hours: bi("9 to 5") } },
    { type: "contactBlock", attrs: { label: bi("Web"), channel: "url", value: "https://example.com" } },
    { type: "contactBlock", attrs: { label: bi("Phone"), channel: "phone", value: "02 696 5000" } },
  ];

  for (const block of blocks) {
    it(`${block.type} ${JSON.stringify(block.attrs).slice(0, 40)}`, () => {
      expectRoundTrip(doc(p(t("before")), block, p(t("after"))));
    });
  }

  it("blocks next to each other and to lists", () => {
    expectRoundTrip(doc(...blocks, { type: "bulletList", content: [li(p(t("a")))] }, blocks[0]!, blocks[1]!));
  });

  it("writes readable directives", () => {
    const md = docToMarkdown(doc(blocks[5]!));
    expect(md).toMatch(/^::callout\{tone="warning" title\.th="Careful" title\.en="Careful \(en\)" body\.th="/);
  });
});

describe("markdown round trip: a whole document", () => {
  it("every node and mark in one document", () => {
    expectRoundTrip(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Everything")] },
        p(t("Plain, "), t("bold", "bold"), t(", "), t("italic", "italic"), t(", "), t("under", "underline"), t(", "), t("strike", "strike"), t(", "), t("code", "code"), t(", "), t("link", link("/en"))),
        { type: "blockquote", content: [p(t("quote"))] },
        { type: "bulletList", content: [li(p(t("b")))] },
        { type: "orderedList", content: [li(p(t("o")))] },
        { type: "codeBlock", attrs: { language: "js" }, content: [t("x()")] },
        { type: "horizontalRule" },
        { type: "table", content: [{ type: "tableRow", content: [cell("tableHeader", t("h"))] }, { type: "tableRow", content: [cell("tableCell", t("c"))] }] },
        { type: "calloutBox", attrs: { tone: "info", body: bi("b") } },
      ),
    );
  });

  it("an empty document is an empty string", () => {
    expect(docToMarkdown(doc())).toBe("");
    expect(markdownToDoc("")).toEqual({ type: "doc", content: [] });
    expect(markdownToDoc("  \n\n")).toEqual({ type: "doc", content: [] });
  });
});

describe("markdown input people actually type", () => {
  it("clamps heading levels to 2 to 4", () => {
    expect(markdownToDoc("# a\n\n##### b").content.map((n) => n.attrs?.level)).toEqual([2, 4]);
  });

  it("accepts underscore emphasis, alignment markers, soft line breaks and html breaks", () => {
    expect(roundTrip(markdownToDoc("_it_ and __bold__\nsame paragraph<br>next"))).toEqual(
      doc(p(t("it", "italic"), t(" and "), t("bold", "bold"), t(" same paragraph"), { type: "hardBreak" }, t("next"))),
    );
    const table = markdownToDoc("| a | b |\n|:--|--:|\n| 1 | 2 |");
    expect(table.content[0]!.content![0]!.content![0]!.type).toBe("tableHeader");
  });

  it("pads short table rows", () => {
    const table = markdownToDoc("| a | b |\n| - | - |\n| only |");
    expect(table.content[0]!.content![1]!.content).toHaveLength(2);
  });

  it("keeps the link text and target of a bare autolink", () => {
    expect(markdownToDoc("<https://example.com>")).toEqual(doc(p(t("https://example.com", link("https://example.com")))));
  });

  it("indented code becomes a code block", () => {
    expect(markdownToDoc("para\n\n    indented").content[1]!.type).toBe("codeBlock");
  });

  it("loose list items merge their paragraphs with a line break", () => {
    const list = markdownToDoc("- a\n\n  b\n- c");
    expect(list.content[0]!.content![0]!.content![0]!.content).toHaveLength(3);
  });
});

describe("markdown errors", () => {
  it("rejects unsafe links with the schema's message", () => {
    expect(() => markdownToDoc("[x](ftp://example.com/file)")).toThrow(RichTextError);
  });

  it("rejects pictures in Markdown syntax", () => {
    expect(() => markdownToDoc("![alt](https://example.com/a.png)")).toThrow(MarkdownError);
  });

  it("rejects unknown and malformed directives with a line number", () => {
    expect(() => markdownToDoc("ok\n\n::video{src=\"x\"}")).toThrow(/Line 3.*Unknown block/);
    expect(() => markdownToDoc('::callout{tone="info" body.th="x"')).toThrow(/closing/);
    expect(() => markdownToDoc("::callout{tone=info}")).toThrow(/quotes/);
    expect(() => markdownToDoc('::callout{tone="info" body.th="a" body.en="b"} extra')).toThrow(/closing|Nothing/);
  });

  it("rejects block attrs that fail the schema", () => {
    expect(() => markdownToDoc('::callout{tone="loud" body.th="a" body.en="b"}')).toThrow(RichTextError);
    expect(() => markdownToDoc('::image{imageId="x" isDecorative=false}')).toThrow(RichTextError);
  });

  it("rejects structures a list, quote or cell cannot hold", () => {
    expect(() => markdownToDoc("- a\n  ## heading")).toThrow(MarkdownError);
    expect(() => markdownToDoc("> ```\n> code\n> ```")).toThrow(MarkdownError);
    expect(() => markdownToDoc("- a\n\n  ::form{formId=\"x\"}")).toThrow(MarkdownError);
  });

  it("does not read directives inside code fences", () => {
    expect(markdownToDoc("```\n::image{x=1}\n```").content[0]!.type).toBe("codeBlock");
  });
});

describe("fixed point on awkward input", () => {
  it("whitespace at the edge of a mark moves outside it, then stays put", () => {
    const messy = doc(p(t("bold ", "bold"), t("plain"), t(" italic", "italic")));
    const md = docToMarkdown(messy);
    const once = markdownToDoc(md);
    expect(docToMarkdown(once)).toBe(md);
    expect(once.content[0]!.content!.map((n) => n.text).join("")).toBe("bold plain italic");
  });
});

describe("generated mark combinations", () => {
  const MARKS = ["bold", "italic", "underline", "strike"] as const;
  const WORDS = ["alpha", "beta", "กข", "x1", "Delta"];

  function random(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  it("round trips random mark runs over words", () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      const rnd = random(seed);
      const nodes: RichTextNode[] = [];
      const count = 1 + Math.floor(rnd() * 5);
      for (let i = 0; i < count; i++) {
        const marks = MARKS.filter(() => rnd() < 0.35);
        const word = WORDS[Math.floor(rnd() * WORDS.length)]!;
        const prevMarks = nodes[i - 1]?.marks ?? [];
        const star = (ms: readonly { type: string }[]) => ms.every((m) => m.type === "bold" || m.type === "italic");
        const joined = i > 0 && star(marks.map((type) => ({ type }))) && star(prevMarks) && rnd() < 0.5;
        nodes.push(t(i === 0 || joined ? word : ` ${word}`, ...marks));
      }
      const d = doc(p(...nodes));
      const md = docToMarkdown(d);
      if (docToMarkdown(markdownToDoc(md)) !== md) failures.push(`unstable seed ${seed}: ${md}`);
      const chars = (x: RichTextDoc) =>
        x.content[0]!.content!.flatMap((n) => [...n.text!].filter((c) => c.trim()).map((c) => `${c}:${(n.marks ?? []).map((m) => m.type).sort().join("+")}`)).join(" ");
      if (chars(roundTrip(d)) !== chars(d)) failures.push(`marks seed ${seed}: ${md}`);
    }
    expect(failures).toEqual([]);
  });
});
