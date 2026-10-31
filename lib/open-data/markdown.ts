/**
 * A focused Markdown parser for the transcriptions of the source documents.
 * It handles only what the transcriptions use: headings, paragraphs, bold,
 * italic, underline, strike-through, links, tables, block quotes, nested lists,
 * horizontal rules, `<a id>` anchors and `<!-- page N -->` markers. Output is a
 * plain tree, so nothing is ever injected as HTML. No React and no server-only
 * import, so it runs in tests.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong" | "em" | "del" | "u"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "anchor"; id: string };

export interface ListItem {
  /** The number the source wrote, for an ordered list; null for a bullet. */
  number: number | null;
  /** True when the item's text already starts with its printed number, such as "(1)" or "ก.". */
  printed: boolean;
  c: Inline[];
  nested: Block[];
}

export interface TableCell {
  c: Inline[];
  align: "start" | "end" | "center";
}

export type Block =
  | { t: "heading"; level: number; ids: string[]; c: Inline[] }
  | { t: "paragraph"; ids: string[]; c: Inline[] }
  | { t: "quote"; c: Block[] }
  | { t: "list"; ordered: boolean; items: ListItem[] }
  | { t: "table"; head: TableCell[]; rows: TableCell[][] }
  | { t: "page"; n: number }
  | { t: "rule" };

const ANCHOR_AT_START = /^\s*<a id="([^"]*)"><\/a>/;
const PAGE_MARKER = /^\s*<!--\s*page\s+(\d+)\s*-->\s*$/i;
const HEADING = /^(#{1,6})[ \t]+(.*?)[ \t#]*$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const LIST_LINE = /^(\s*)([-*+]|\d+[.)])[ \t]+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

const PRINTED_NUMBER = new RegExp(
  [
    "^\\([0-9\\u0E50-\\u0E59]+\\)",
    "^\\([\\u0E01-\\u0E2E]{1,2}\\)",
    "^\\([A-Za-z]{1,3}\\)",
    "^[0-9\\u0E50-\\u0E59]+(?:\\.[0-9\\u0E50-\\u0E59]+)+(?=[\\s.)]|$)",
    "^[0-9\\u0E50-\\u0E59]+[.)](?=\\s|$)",
    "^[\\u0E01-\\u0E2E][.)](?=\\s|$)",
    "^[A-Za-z][.)](?=\\s|$)",
  ].join("|"),
);

/** True when a list item's text starts with the number the document itself printed. */
export function startsWithPrintedNumber(text: string): boolean {
  return PRINTED_NUMBER.test(text.replace(/^(\*\*|__|<u>)+/, "").trimStart());
}

export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.t === "text") return node.v;
      if (node.t === "anchor") return "";
      return inlineText(node.c);
    })
    .join("");
}

function pushText(out: Inline[], value: string) {
  if (value === "") return;
  const last = out[out.length - 1];
  if (last && last.t === "text") last.v += value;
  else out.push({ t: "text", v: value });
}

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const ch = source[i] ?? "";

    if (ch === "\\" && i + 1 < source.length && /[\\`*_{}[\]()#+\-.!|~<>]/.test(source[i + 1] ?? "")) {
      pushText(out, source[i + 1] ?? "");
      i += 2;
      continue;
    }

    const anchor = /^<a id="([^"]*)"><\/a>/.exec(rest);
    if (anchor?.[1] !== undefined) {
      out.push({ t: "anchor", id: anchor[1] });
      i += anchor[0].length;
      continue;
    }

    if (rest.startsWith("<u>")) {
      const end = rest.indexOf("</u>", 3);
      if (end > 0) {
        out.push({ t: "u", c: parseInline(rest.slice(3, end)) });
        i += end + 4;
        continue;
      }
    }

    const delimited: Array<[string, "strong" | "del", number]> = [
      ["**", "strong", 2],
      ["~~", "del", 2],
    ];
    let matched = false;
    for (const [open, t, width] of delimited) {
      if (rest.startsWith(open)) {
        const end = rest.indexOf(open, width);
        if (end > width) {
          out.push({ t, c: parseInline(rest.slice(width, end)) });
          i += end + width;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    if (ch === "*" && !rest.startsWith("**") && rest[1] !== undefined && !/\s/.test(rest[1])) {
      const end = rest.indexOf("*", 1);
      if (end > 1 && !/\s/.test(rest[end - 1] ?? "")) {
        out.push({ t: "em", c: parseInline(rest.slice(1, end)) });
        i += end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
      if (link?.[1] !== undefined && link[2] !== undefined && /^(https?:\/\/|\/|#|mailto:)/i.test(link[2])) {
        out.push({ t: "link", href: link[2], c: parseInline(link[1]) });
        i += link[0].length;
        continue;
      }
    }

    pushText(out, ch);
    i += 1;
  }
  return out;
}

function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  const cells: string[] = [];
  let cell = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && text[i + 1] === "|") {
      cell += "|";
      i++;
    } else if (ch === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function alignOf(separator: string): TableCell["align"] {
  const s = separator.trim();
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  return s.endsWith(":") ? "end" : "start";
}

function indentOf(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === " ") width += 1;
    else if (ch === "\t") width += 4;
    else break;
  }
  return width;
}

function parseList(lines: string[]): Block[] {
  const blocks: Block[] = [];
  const first = lines[0];
  if (first === undefined) return blocks;
  const base = indentOf(first);
  let list: Extract<Block, { t: "list" }> | null = null;
  let item: { marker: string; text: string[]; children: string[] } | null = null;
  const entries: Array<{ marker: string; text: string[]; children: string[] }> = [];

  for (const line of lines) {
    const match = LIST_LINE.exec(line);
    if (match && indentOf(line) <= base) {
      item = { marker: match[2] ?? "-", text: [match[3] ?? ""], children: [] };
      entries.push(item);
    } else if (item) {
      item.children.push(line);
    }
  }

  for (const entry of entries) {
    const ordered = /^\d/.test(entry.marker);
    const nestedStart = entry.children.findIndex((l) => LIST_LINE.test(l));
    const continuation = (nestedStart === -1 ? entry.children : entry.children.slice(0, nestedStart))
      .map((l) => l.trim())
      .filter(Boolean);
    const nestedLines = nestedStart === -1 ? [] : entry.children.slice(nestedStart).filter((l) => l.trim() !== "");
    const text = [...entry.text, ...continuation].join("\n");
    const listItem: ListItem = {
      number: ordered ? Number.parseInt(entry.marker, 10) : null,
      printed: startsWithPrintedNumber(text),
      c: parseInline(text),
      nested: nestedLines.length > 0 ? parseList(nestedLines) : [],
    };
    if (!list || list.ordered !== ordered) {
      list = { t: "list", ordered, items: [] };
      blocks.push(list);
    }
    list.items.push(listItem);
  }
  return blocks;
}

function startsBlock(line: string): boolean {
  return (
    HEADING.test(line.trim()) ||
    /^\s*>/.test(line) ||
    /^\s*\|/.test(line) ||
    LIST_LINE.test(line) ||
    PAGE_MARKER.test(line) ||
    RULE.test(line)
  );
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let pendingIds: string[] = [];
  let i = 0;

  const takeIds = (own: string[]) => {
    const ids = [...pendingIds, ...own];
    pendingIds = [];
    return ids;
  };

  while (i < lines.length) {
    let line = lines[i] ?? "";
    if (line.trim() === "") {
      i++;
      continue;
    }

    const ids: string[] = [];
    for (let m = ANCHOR_AT_START.exec(line); m; m = ANCHOR_AT_START.exec(line)) {
      ids.push(m[1] ?? "");
      line = line.slice(m[0].length);
    }
    if (line.trim() === "") {
      pendingIds.push(...ids);
      i++;
      continue;
    }

    const page = PAGE_MARKER.exec(line);
    if (page?.[1] !== undefined) {
      blocks.push({ t: "page", n: Number.parseInt(page[1], 10) });
      i++;
      continue;
    }

    const heading = HEADING.exec(line.trim());
    if (heading?.[1] !== undefined) {
      blocks.push({ t: "heading", level: heading[1].length, ids: takeIds(ids), c: parseInline(heading[2] ?? "") });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ t: "rule" });
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i] ?? "")) {
        quoted.push((lines[i] ?? "").replace(/^\s*> ?/, ""));
        i++;
      }
      blocks.push({ t: "quote", c: parseMarkdown(quoted.join("\n")) });
      continue;
    }

    const next = lines[i + 1];
    if (/^\s*\|/.test(line) && next !== undefined && TABLE_SEPARATOR.test(next) && next.includes("-")) {
      const head = splitRow(line);
      const aligns = splitRow(next).map(alignOf);
      const rows: TableCell[][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) {
        rows.push(splitRow(lines[i] ?? "").map((cell, index) => ({ c: parseInline(cell), align: aligns[index] ?? "start" })));
        i++;
      }
      const width = Math.max(head.length, ...rows.map((r) => r.length));
      const pad = (row: TableCell[]) => [...row, ...Array.from({ length: width - row.length }, (): TableCell => ({ c: [], align: "start" }))];
      blocks.push({
        t: "table",
        head: pad(head.map((cell, index) => ({ c: parseInline(cell), align: aligns[index] ?? "start" }))),
        rows: rows.map(pad),
      });
      continue;
    }

    if (LIST_LINE.test(line)) {
      pendingIds.push(...ids);
      lines[i] = line;
      const group: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        if (current.trim() === "") {
          let j = i;
          while (j < lines.length && (lines[j] ?? "").trim() === "") j++;
          const after = lines[j];
          if (after !== undefined && LIST_LINE.test(after) && indentOf(after) > 0) {
            i = j;
            continue;
          }
          break;
        }
        if (!LIST_LINE.test(current) && indentOf(current) === 0) break;
        group.push(current);
        i++;
      }
      blocks.push(...parseList(group));
      continue;
    }

    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (current.trim() === "" || startsBlock(current) || ANCHOR_AT_START.test(current)) break;
      para.push(current.trim());
      i++;
    }
    blocks.push({ t: "paragraph", ids: takeIds(ids), c: parseInline(para.join("\n")) });
  }
  return blocks;
}

/** "th" for text that is mostly Thai, "en" for the official English translation and any other Latin text. */
export function detectLanguage(markdown: string): "th" | "en" {
  const thai = (markdown.match(/[฀-๿]/g) ?? []).length;
  const latin = (markdown.match(/[A-Za-z]/g) ?? []).length;
  return thai >= latin * 0.2 ? "th" : "en";
}
