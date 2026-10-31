import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Transcript } from "@/components/domain/open-data/Transcript";
import { OPEN_DATA_DIR } from "@/lib/open-data/import";
import { classifyMinutes, splitContribution } from "@/lib/open-data/minutes";
import { inlineText, parseInline, parseMarkdown } from "@/lib/open-data/markdown";
import { parseFrontMatter } from "@/lib/open-data/parse";

const MINUTES = ["28", "29", "39", "40", "41", "42", "43", "44", "45"];
const collapse = (text: string) => text.replace(/\s+/g, "");
const plainText = (markup: string) =>
  collapse(
    markup
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'"),
  );
const body = (n: string) => parseFrontMatter(readFileSync(`${OPEN_DATA_DIR}/transcripts/${n}.md`, "utf8")).body;

describe("splitContribution", () => {
  it("splits at the speech verb and keeps every character", () => {
    const text = "คุณรัชพล สังวรธรรม ประธานสภานักศึกษาฯ ท่าพระจันทร์ กล่าวว่า ขอเริ่มประชุม";
    const found = splitContribution(parseInline(text));
    expect(found?.prefix).toBe("คุณรัชพล สังวรธรรม ประธานสภานักศึกษาฯ ท่าพระจันทร์");
    expect(found ? found.prefix + inlineText(found.rest) : "").toBe(text);
  });

  it("handles a verb joined to the role and an optional ได้", () => {
    expect(splitContribution(parseInline("คุณรัชพล สังวรธรรม ประธานในที่ประชุมกล่าวขอบคุณ"))?.prefix).toBe("คุณรัชพล สังวรธรรม ประธานในที่ประชุม");
    expect(splitContribution(parseInline("คุณอนุชิต ไตรทิพย์ สมาชิกสภา ได้สอบถามประธาน"))?.prefix).toBe("คุณอนุชิต ไตรทิพย์ สมาชิกสภา");
  });

  it("leaves other paragraphs alone", () => {
    expect(splitContribution(parseInline("ประธานสภา กล่าวว่า x"))).toBeNull();
    expect(splitContribution(parseInline("คุณรัชพล"))).toBeNull();
    expect(splitContribution(parseInline("**คุณรัชพล สังวรธรรม** กล่าวว่า x"))).toBeNull();
  });
});

describe("classifyMinutes", () => {
  it("recognises resolutions, times, signatures and agenda sections", () => {
    const blocks = parseMarkdown(
      [
        '<a id="item-3"></a>',
        "## ระเบียบวาระที่ 3 ก",
        '<a id="item-3-1"></a>',
        "### 3.1 ข",
        "**มติที่ประชุม:** สรุป",
        "**เริ่มประชุมเวลา 16.50 น.**",
        "[ลายมือชื่อ]\n(ก)\nผู้บันทึก",
        "(ข)",
        "<!-- page 2 -->",
        "(ค)",
      ].join("\n\n"),
    );
    expect(classifyMinutes(blocks).map((k) => k.k)).toEqual(["agenda", "agenda", "resolution", "time", "signature", "signature", "plain", "plain"]);
    expect(classifyMinutes(blocks).map((k) => (k.k === "agenda" ? k.level : null)).slice(0, 2)).toEqual(["item", "sub"]);
  });

  it("shows a vote table as a division and any other table as a table", () => {
    const votes = parseMarkdown("| | จำนวน | |\n|---|---|---|\n| รับรอง | 16 | เสียง |\n| ไม่รับรอง | 0 | เสียง |\n| องค์ประชุม | 30 | คน |");
    const other = parseMarkdown("| ลำดับ | ชื่อ | สังกัด |\n|---|---|---|\n| 1 | ก | ข |");
    const mixed = parseMarkdown("| | จำนวน | |\n|---|---|---|\n| รับรอง | 16 | เสียง |\n| อื่น ๆ | 1 | เสียง |");
    expect(classifyMinutes(votes)[0]?.k).toBe("division");
    expect(classifyMinutes(other)[0]?.k).toBe("plain");
    expect(classifyMinutes(mixed)[0]?.k).toBe("plain");
  });

  for (const n of MINUTES) {
    it(`finds the structure of ${n}.md and keeps contributions contiguous`, () => {
      const blocks = parseMarkdown(body(n));
      const kinds = classifyMinutes(blocks);
      expect(kinds).toHaveLength(blocks.length);
      kinds.forEach((kind, index) => {
        const block = blocks[index];
        if (kind.k === "contribution" && block?.t === "paragraph") {
          expect(kind.contribution.prefix + inlineText(kind.contribution.rest)).toBe(inlineText(block.c));
        }
        if (kind.k === "division" && block?.t === "table") {
          expect(kind.division.rows).toHaveLength(block.rows.length);
        }
      });
      expect(kinds.some((k) => k.k === "agenda")).toBe(true);
    });
  }

  for (const n of MINUTES) {
    it(`renders every character of ${n}.md in order`, () => {
      const source = body(n);
      const blocks = parseMarkdown(source);
      const markup = renderToStaticMarkup(createElement(Transcript, { markdown: source, locale: "en", headingLevel: 3, variant: "minutes" }));
      const rendered = plainText(markup);
      let from = 0;
      for (const block of blocks) {
        const pieces: string[] = [];
        if (block.t === "paragraph" || block.t === "heading") pieces.push(inlineText(block.c));
        if (block.t === "table") for (const row of [block.head, ...block.rows]) for (const cell of row) pieces.push(inlineText(cell.c));
        if (block.t === "list") for (const item of block.items) pieces.push(inlineText(item.c));
        for (const piece of pieces) {
          const wanted = collapse(piece);
          if (wanted === "") continue;
          const at = rendered.indexOf(wanted, from);
          expect(at, wanted.slice(0, 60)).toBeGreaterThanOrEqual(from);
          from = at + wanted.length;
        }
      }
    });

    it(`keeps every anchor id of ${n}.md`, () => {
      const source = body(n);
      const markup = renderToStaticMarkup(createElement(Transcript, { markdown: source, locale: "en", headingLevel: 3, variant: "minutes" }));
      for (const m of source.matchAll(/<a id="([^"]*)"><\/a>/g)) expect(markup).toContain(`id="${m[1]}"`);
    });
  }
});
