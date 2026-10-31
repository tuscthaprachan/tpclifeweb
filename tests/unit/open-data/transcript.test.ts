import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Transcript } from "@/components/domain/open-data/Transcript";
import { OPEN_DATA_DIR } from "@/lib/open-data/import";
import { detectLanguage, parseInline, parseMarkdown, startsWithPrintedNumber, type Block } from "@/lib/open-data/markdown";
import { parseFrontMatter } from "@/lib/open-data/parse";

const body = (n: string) => parseFrontMatter(readFileSync(`${OPEN_DATA_DIR}/transcripts/${n}.md`, "utf8")).body;
const html = (markdown: string, locale: "th" | "en" = "en") =>
  renderToStaticMarkup(createElement(Transcript, { markdown, locale, headingLevel: 3 }));
const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("parseInline", () => {
  it("reads bold, underline, strike-through, italics and anchors", () => {
    const nodes = parseInline('<a id="clause-1"></a>**ข้อ 1** <u>x</u> ~~y~~ *z*');
    expect(nodes.map((n) => n.t)).toEqual(["anchor", "strong", "text", "u", "text", "del", "text", "em"]);
  });

  it("keeps stray asterisks and brackets as text", () => {
    expect(parseInline("5 * 3 [?]")).toEqual([{ t: "text", v: "5 * 3 [?]" }]);
  });
});

describe("startsWithPrintedNumber", () => {
  it("recognises the numbers the documents print", () => {
    for (const text of ["(1) text", "(๑) text", "ก. text", "(ก) text", "๒.๕.๑ text", "3. text", "a) text", "**(2)** text"]) {
      expect(startsWithPrintedNumber(text), text).toBe(true);
    }
  });

  it("does not take ordinary words or figures for a printed number", () => {
    for (const text of ["The expiration", "ผู้มีสิทธิ", "2569 budget", "ค่าใช้จ่าย"]) {
      expect(startsWithPrintedNumber(text), text).toBe(false);
    }
  });
});

describe("parseMarkdown", () => {
  it("keeps anchors on the block that follows them and reads page markers", () => {
    const blocks = parseMarkdown('<!-- page 2 -->\n\n<a id="item-4-1"></a>### ระเบียบวาระที่ 4.1\n\n<a id="clause-3"></a>**ข้อ 3** text');
    expect(blocks[0]).toEqual({ t: "page", n: 2 });
    expect(blocks[1]).toMatchObject({ t: "heading", level: 3, ids: ["item-4-1"] });
    expect(blocks[2]).toMatchObject({ t: "paragraph", ids: ["clause-3"] });
  });

  it("nests lists and keeps the source number of an ordered item", () => {
    const [list] = parseMarkdown("1. (1) one\n2. (2) two\n    - ก. a\n    - ข. b\n3. (3) three");
    expect(list).toMatchObject({ t: "list", ordered: true });
    if (list?.t !== "list") throw new Error("not a list");
    expect(list.items.map((i) => [i.number, i.printed])).toEqual([[1, true], [2, true], [3, true]]);
    expect(list.items[1]?.nested[0]).toMatchObject({ t: "list", ordered: false });
  });

  it("parses tables with alignment and pads short rows", () => {
    const [table] = parseMarkdown("| a | b |\n|---|--:|\n| 1 |\n| 2 | 3 |");
    expect(table).toMatchObject({ t: "table" });
    if (table?.t !== "table") throw new Error("not a table");
    expect(table.head.map((c) => c.align)).toEqual(["start", "end"]);
    expect(table.rows.every((r) => r.length === 2)).toBe(true);
  });

  it("parses a block quote as blocks", () => {
    const [quote] = parseMarkdown("> [ภาพ: ตรา]\n>\n> second");
    expect(quote).toMatchObject({ t: "quote" });
    expect((quote as Extract<Block, { t: "quote" }>).c).toHaveLength(2);
  });
});

describe("detectLanguage", () => {
  it("tells the English translation from a Thai document", () => {
    expect(detectLanguage(body("26"))).toBe("th");
    expect(detectLanguage(body("25"))).toBe("en");
  });
});

describe("Transcript: a regulation (file 15)", () => {
  const out = html(body("15"));

  it("keeps clause anchors as ids", () => {
    expect(out).toContain('id="clause-1"');
    expect(out).toContain('id="clause-5"');
  });

  it("shows page breaks as a marker", () => {
    expect(out).toContain("[Page 2 of the original]");
    expect(html(body("15"), "th")).toContain("[หน้า 2 ของต้นฉบับ]");
  });

  it("renders printed sub-clause numbers as text and generates none", () => {
    expect(out).toContain("(1) การจัดกิจกรรมต้องเป็นไปโดยสมัครใจ");
    expect(out).toContain("ก. การกระทำที่มีลักษณะรบกวน");
    expect(out).not.toContain("<ol");
    expect(out).not.toMatch(/<li[^>]*>1\. \(1\)/);
  });

  it("renders the block quote and bold clause numbers", () => {
    expect(out).toContain("<blockquote");
    expect(out).toContain("<strong>ข้อ 1</strong>");
  });
});

describe("Transcript: minutes (file 40)", () => {
  const out = html(body("40"));

  it("renders the attendance tables with the site table and stacked cells", () => {
    expect(out).toContain("<table");
    expect(out).toContain('data-label="ชื่อ"');
    expect(out).toContain("Table 1 in the text");
  });

  it("keeps item anchors and agenda headings", () => {
    expect(out).toMatch(/id="item-\d/);
    expect(out).toContain("<u>รายชื่อผู้มาประชุม</u>");
  });

  it("starts the transcript headings at the depth it is given", () => {
    expect(out).toContain("<h3");
    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<h2");
  });

  it("renders every transcript without throwing and without a generated list number", () => {
    for (let n = 1; n <= 49; n++) {
      const file = String(n).padStart(2, "0");
      const rendered = html(body(file));
      expect(rendered.length, file).toBeGreaterThan(200);
      expect(count(rendered, "<ol"), file).toBe(0);
    }
  });
});

describe("Transcript: English list without a printed number (file 25)", () => {
  it("shows the number the source wrote, as text", () => {
    expect(html(body("25"))).toContain("1. The expiration of the Council");
  });
});
