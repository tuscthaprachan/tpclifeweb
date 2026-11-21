import MarkdownIt from "markdown-it";
import ins from "markdown-it-ins";

import { cleanBlockAttrs, normaliseEditorDoc } from "./editor";
import { parseRichTextDoc, RichTextError } from "./schema";
import type { RichTextDoc, RichTextMark, RichTextNode } from "./types";

/**
 * Rich text as Markdown and back, for the editor's Markdown mode. Standard
 * Markdown covers paragraphs, headings 2 to 4, lists, quotes, code, rules,
 * pipe tables and the marks bold (`**`), italic (`*`), underline (`++`),
 * strike (`~~`), code and links. The custom blocks are leaf directives on
 * one line, `::name{key="value" nested.key="value" list.0.key=true}`, whose
 * attributes are the block's attrs flattened with dotted paths, so bilingual
 * `{ th, en }` copy round-trips exactly. The result of `markdownToDoc` is
 * always checked by `parseRichTextDoc`; the server still validates on save.
 */

export class MarkdownError extends Error {
  constructor(
    message: string,
    readonly line?: number,
  ) {
    super(line === undefined ? message : `Line ${line}: ${message}`);
    this.name = "MarkdownError";
  }
}

type Raw = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Directives
 * ------------------------------------------------------------------ */

const DIRECTIVE_NAMES = {
  image: "image",
  formCallout: "form",
  linkOut: "link-card",
  calloutBox: "callout",
  stepList: "steps",
  contactBlock: "contact",
  liveTimeline: "timeline",
} as const;

const DIRECTIVE_TYPES = Object.fromEntries(Object.entries(DIRECTIVE_NAMES).map(([type, name]) => [name, type])) as Record<string, keyof typeof DIRECTIVE_NAMES>;

const isRecord = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

function flatten(value: unknown, path: string, out: Array<[string, string | number | boolean]>) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) value.forEach((item, i) => flatten(item, path ? `${path}.${i}` : String(i), out));
  else if (isRecord(value)) for (const [k, v] of Object.entries(value)) flatten(v, path ? `${path}.${k}` : k, out);
  else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out.push([path, value]);
}

const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;

function directiveLine(type: keyof typeof DIRECTIVE_NAMES, attrs: Raw | undefined): string {
  const pairs: Array<[string, string | number | boolean]> = [];
  flatten(attrs ?? {}, "", pairs);
  const body = pairs.map(([k, v]) => `${k}=${typeof v === "string" ? quote(v) : String(v)}`).join(" ");
  return `::${DIRECTIVE_NAMES[type]}{${body}}`;
}

function setPath(target: Raw, path: string, value: unknown) {
  const parts = path.split(".");
  let node: Raw | unknown[] = target;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    const key: string | number = Array.isArray(node) ? Number(part) : part;
    if (last) {
      (node as Raw)[key as string] = value;
      return;
    }
    const nextIsIndex = /^\d+$/.test(parts[i + 1]!);
    const holder = node as Raw;
    if (holder[key as string] === undefined) holder[key as string] = nextIsIndex ? [] : {};
    node = holder[key as string] as Raw | unknown[];
  });
}

function parseDirective(line: string, lineNo: number): RichTextNode {
  const head = /^::([a-z][a-z-]*)\{/.exec(line);
  if (!head) throw new MarkdownError('A block starts with "::name{" and ends with "}"', lineNo);
  const type = DIRECTIVE_TYPES[head[1]!];
  if (!type) throw new MarkdownError(`Unknown block "${head[1]}". Use ${Object.values(DIRECTIVE_NAMES).join(", ")}`, lineNo);
  const attrs: Raw = {};
  let i = head[0].length;
  const skip = () => {
    while (line[i] === " ") i++;
  };
  skip();
  while (line[i] !== "}") {
    const key = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*/.exec(line.slice(i));
    if (!key) throw new MarkdownError("Expected an attribute name", lineNo);
    i += key[0].length;
    if (line[i] !== "=") throw new MarkdownError(`Attribute "${key[0]}" needs =value`, lineNo);
    i++;
    let value: unknown;
    if (line[i] === '"') {
      i++;
      let s = "";
      for (;;) {
        const ch = line[i];
        if (ch === undefined) throw new MarkdownError("A quoted value is not closed", lineNo);
        i++;
        if (ch === '"') break;
        if (ch === "\\") {
          const next = line[i++];
          s += next === "n" ? "\n" : next === "r" ? "\r" : next === "t" ? "\t" : (next ?? "");
        } else s += ch;
      }
      value = s;
    } else {
      const bare = /^[^\s}]+/.exec(line.slice(i));
      if (!bare) throw new MarkdownError(`Attribute "${key[0]}" needs a value`, lineNo);
      i += bare[0].length;
      if (bare[0] === "true") value = true;
      else if (bare[0] === "false") value = false;
      else if (/^-?\d+(\.\d+)?$/.test(bare[0])) value = Number(bare[0]);
      else throw new MarkdownError(`Put text values in quotes: ${key[0]}="..."`, lineNo);
    }
    setPath(attrs, key[0], value);
    if (i >= line.length) throw new MarkdownError('The block needs a closing "}"', lineNo);
    if (line[i] !== " " && line[i] !== "}") throw new MarkdownError("Separate attributes with a space", lineNo);
    skip();
    if (i >= line.length) throw new MarkdownError('The block needs a closing "}"', lineNo);
  }
  if (line.slice(i + 1).trim() !== "") throw new MarkdownError('Nothing may follow the closing "}"', lineNo);
  return { type, attrs: cleanBlockAttrs(type, attrs) };
}

/* ------------------------------------------------------------------ *
 * Document to Markdown
 * ------------------------------------------------------------------ */

type Mode = "block" | "heading" | "cell";

interface Atom {
  text: string;
  marks: RichTextMark[];
  isBreak?: boolean;
}

const markKey = (m: RichTextMark) => (m.type === "link" ? `link:${String(m.attrs?.href ?? "")}` : m.type);
const hasMark = (marks: RichTextMark[], key: string) => marks.some((m) => markKey(m) === key);

function escapeText(text: string, mode: Mode): string {
  let out = text.replace(/[\\`*_[\]<>~]/g, "\\$&").replace(/\+\+/g, "\\+\\+").replace(/&(?=#?[A-Za-z0-9]+;)/g, "\\&");
  if (mode === "cell") out = out.replace(/\|/g, "\\|");
  return out;
}

/** Escapes a first character that would start a block (heading, list, quote, rule, directive). */
function escapeLineStart(text: string): string {
  const digits = /^(\d+)([.)])/.exec(text);
  if (digits) return `${digits[1]}\\${text.slice(digits[1]!.length)}`;
  return /^[#>\-+=:|]/.test(text) ? `\\${text}` : text;
}

function codeSpan(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((r) => r.length));
  const fence = "`".repeat(longest + 1);
  const pad = /^[ `]|[ `]$/.test(text) ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

const OPEN: Record<string, string> = { bold: "**", italic: "*", underline: "++", strike: "~~", link: "[" };
const CLOSE: Record<string, (m: RichTextMark) => string> = {
  bold: () => "**",
  italic: () => "*",
  underline: () => "++",
  strike: () => "~~",
  link: (m) => {
    const href = String(m.attrs?.href ?? "");
    return `](${/[()<>]/.test(href) ? `<${href.replace(/[<>]/g, "\\$&")}>` : href})`;
  },
};

/** Splits text nodes so whitespace at the edge of a mark stays outside it, which Markdown requires of its delimiters. */
function toAtoms(nodes: readonly RichTextNode[]): Atom[] {
  const atoms: Atom[] = [];
  nodes.forEach((node, i) => {
    if (node.type === "hardBreak") {
      atoms.push({ text: "", marks: [], isBreak: true });
      return;
    }
    if (node.type !== "text" || !node.text) return;
    const marks = node.marks ?? [];
    const prev = nodes[i - 1]?.type === "text" ? (nodes[i - 1]!.marks ?? []) : [];
    const next = nodes[i + 1]?.type === "text" ? (nodes[i + 1]!.marks ?? []) : [];
    if (hasMark(marks, "code")) {
      atoms.push({ text: node.text, marks });
      return;
    }
    const lead = /^\s*/.exec(node.text)![0];
    const core = node.text.trim();
    const trail = core ? /\s*$/.exec(node.text)![0] : "";
    const shared = (a: RichTextMark[], b: RichTextMark[]) => a.filter((m) => hasMark(b, markKey(m)));
    if (!core) {
      atoms.push({ text: node.text, marks: shared(shared(marks, prev), next) });
      return;
    }
    if (lead) atoms.push({ text: lead, marks: shared(marks, prev) });
    atoms.push({ text: core, marks });
    if (trail) atoms.push({ text: trail, marks: shared(marks, next) });
  });
  return atoms;
}

function inlineToMarkdown(nodes: readonly RichTextNode[] | undefined, mode: Mode): string {
  const atoms = toAtoms(nodes ?? []);
  const runLength = (from: number, key: string) => {
    let n = 0;
    while (from + n < atoms.length && hasMark(atoms[from + n]!.marks, key)) n++;
    return n;
  };
  let out = "";
  let open: RichTextMark[] = [];
  let lineStart = true;
  const closeFrom = (k: number) => {
    for (const m of open.slice(k).reverse()) out += CLOSE[m.type]!(m);
    open = open.slice(0, k);
  };

  atoms.forEach((atom, i) => {
    if (atom.isBreak) {
      closeFrom(0);
      out += mode === "block" ? "\\\n" : "<br>";
      lineStart = true;
      return;
    }
    let want = atom.marks.filter((m) => m.type !== "code");
    if (!hasMark(atom.marks, "code") && /^\s+$/.test(atom.text)) {
      let keep = 0;
      while (keep < open.length && hasMark(want, markKey(open[keep]!))) keep++;
      want = open.slice(0, keep);
    }
    let k = 0;
    while (k < open.length && hasMark(want, markKey(open[k]!))) k++;
    const before = out.length;
    closeFrom(k);
    const closed = out.length > before;
    const toOpen = want
      .filter((m) => !hasMark(open, markKey(m)))
      .sort((x, y) => runLength(i, markKey(y)) - runLength(i, markKey(x)));
    let opened = closed && toOpen.length > 0 ? "<!---->" : "";
    for (const m of toOpen) {
      opened += OPEN[m.type]!;
      open.push(m);
    }
    if (hasMark(atom.marks, "code")) {
      out += codeSpan(atom.text);
    } else {
      let text = escapeText(atom.text, mode);
      if (lineStart && mode === "block" && !opened) text = escapeLineStart(text);
      out += opened + text;
    }
    lineStart = false;
  });
  closeFrom(0);
  if (mode === "heading") out = out.replace(/(?<!\\)#(#*)$/, "\\#$1");
  return out;
}

const indentLines = (text: string, first: string, rest: string) =>
  text
    .split("\n")
    .map((line, i) => (i === 0 ? first + line : line ? rest + line : line))
    .join("\n");

function listToMarkdown(list: RichTextNode): string {
  const ordered = list.type === "orderedList";
  return (list.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : "-";
      const parts = (item.content ?? []).map((child) =>
        child.type === "paragraph" ? inlineToMarkdown(child.content, "block") : listToMarkdown(child),
      );
      return indentLines(parts.join("\n"), `${marker} `, " ".repeat(marker.length + 1)).trimEnd();
    })
    .join("\n");
}

function tableToMarkdown(table: RichTextNode): string {
  const rows = table.content ?? [];
  const headed = rows[0]?.content?.[0]?.type === "tableHeader";
  const cells = (row: RichTextNode) => (row.content ?? []).map((c) => inlineToMarkdown(c.content?.[0]?.content, "cell"));
  const width = rows[0]?.content?.length ?? 1;
  const line = (cs: string[]) => `| ${cs.join(" | ")} |`.replace(/ {2,}\|/g, " |");
  const head = headed ? cells(rows[0]!) : Array<string>(width).fill("");
  const body = headed ? rows.slice(1) : rows;
  return [line(head), line(Array<string>(width).fill("---")), ...body.map((r) => line(cells(r)))].join("\n");
}

function blockToMarkdown(node: RichTextNode): string {
  switch (node.type) {
    case "paragraph":
      return inlineToMarkdown(node.content, "block");
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${inlineToMarkdown(node.content, "heading")}`;
    case "blockquote":
      return blocksToMarkdown(node.content ?? [])
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "bulletList":
    case "orderedList":
      return listToMarkdown(node);
    case "codeBlock": {
      const code = (node.content ?? []).map((c) => c.text ?? "").join("");
      const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((r) => r.length));
      const fence = "`".repeat(Math.max(3, longest + 1));
      return `${fence}${String(node.attrs?.language ?? "")}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "table":
      return tableToMarkdown(node);
    default:
      return directiveLine(node.type as keyof typeof DIRECTIVE_NAMES, node.attrs);
  }
}

function blocksToMarkdown(nodes: readonly RichTextNode[]): string {
  const out: string[] = [];
  nodes.forEach((node, i) => {
    const text = blockToMarkdown(node);
    if (!text && node.type === "paragraph") return;
    const prev = nodes[i - 1];
    const bothLists = prev && /List$/.test(prev.type) && /List$/.test(node.type);
    if (out.length > 0) out.push(bothLists ? "<!-- -->" : "");
    out.push(text);
  });
  return out.join("\n");
}

/** The document as Markdown (with `::name{...}` lines for the custom blocks). */
export function docToMarkdown(doc: RichTextDoc): string {
  const body = blocksToMarkdown(doc.content);
  return body ? `${body}\n` : "";
}

/* ------------------------------------------------------------------ *
 * Markdown to document
 * ------------------------------------------------------------------ */

function makeParser(): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false, breaks: false }).enable("table").enable("strikethrough").use(ins);
  md.normalizeLink = (url) => url;
  md.normalizeLinkText = (url) => url;
  md.block.ruler.before(
    "fence",
    "directive",
    (state, startLine, _end, silent) => {
      if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
      const pos = state.bMarks[startLine]! + state.tShift[startLine]!;
      const line = state.src.slice(pos, state.eMarks[startLine]!);
      if (!line.startsWith("::") || line.startsWith(":::")) return false;
      if (silent) return true;
      const token = state.push("directive", "", 0);
      token.content = line.trimEnd();
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );
  return md;
}

let parser: MarkdownIt | undefined;
type Token = ReturnType<MarkdownIt["parse"]>[number];

const lineOf = (t: Token) => (t.map ? t.map[0] + 1 : undefined);

function inlineNodes(token: Token | undefined): RichTextNode[] {
  const out: RichTextNode[] = [];
  const marks: RichTextMark[] = [];
  const push = (text: string, m: RichTextMark[]) => {
    if (!text) return;
    const last = out[out.length - 1];
    const same = last?.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(m);
    if (same) last!.text += text;
    else out.push({ type: "text", text, ...(m.length ? { marks: m.map((x) => ({ ...x })) } : {}) });
  };
  for (const child of token?.children ?? []) {
    switch (child.type) {
      case "text":
        push(child.content, marks);
        break;
      case "softbreak":
        push(" ", marks);
        break;
      case "hardbreak":
        out.push({ type: "hardBreak" });
        break;
      case "code_inline":
        push(child.content, [{ type: "code" }]);
        break;
      case "html_inline":
        if (child.content === "<!---->") break;
        if (/^<br\s*\/?>$/i.test(child.content)) out.push({ type: "hardBreak" });
        else push(child.content, marks);
        break;
      case "strong_open":
        marks.push({ type: "bold" });
        break;
      case "em_open":
        marks.push({ type: "italic" });
        break;
      case "s_open":
        marks.push({ type: "strike" });
        break;
      case "ins_open":
        marks.push({ type: "underline" });
        break;
      case "link_open":
        marks.push({ type: "link", attrs: { href: child.attrGet("href") ?? "" } });
        break;
      case "strong_close":
      case "em_close":
      case "s_close":
      case "ins_close":
      case "link_close":
        marks.pop();
        break;
      case "image":
        throw new MarkdownError("Pictures are added with ::image{...}, not ![...](...)", token ? lineOf(token) : undefined);
    }
  }
  return out;
}

const paragraph = (token: Token | undefined): RichTextNode => {
  const content = inlineNodes(token);
  return { type: "paragraph", ...(content.length ? { content } : {}) };
};

class Reader {
  constructor(private tokens: Token[]) {}
  private i = 0;
  get done() {
    return this.i >= this.tokens.length;
  }
  peek() {
    return this.tokens[this.i];
  }
  next() {
    return this.tokens[this.i++]!;
  }

  /** Reads blocks until the close token of the current container (not consumed) or the end. */
  blocks(allowed: "doc" | "quote" | "item"): RichTextNode[] {
    const out: RichTextNode[] = [];
    while (!this.done && !this.peek()!.type.endsWith("_close")) {
      const node = this.block(allowed);
      if (node) out.push(node);
    }
    return out;
  }

  private unsupported(token: Token, what: string): never {
    throw new MarkdownError(`${what} cannot go here`, lineOf(token));
  }

  private block(allowed: "doc" | "quote" | "item"): RichTextNode | null {
    const token = this.next();
    const top = allowed === "doc";
    switch (token.type) {
      case "paragraph_open": {
        const inline = this.next();
        this.next();
        return paragraph(inline);
      }
      case "heading_open": {
        if (!top) this.unsupported(token, "A heading");
        const inline = this.next();
        this.next();
        const level = Math.min(4, Math.max(2, Number(token.tag.slice(1))));
        const content = inlineNodes(inline);
        return { type: "heading", attrs: { level }, ...(content.length ? { content } : {}) };
      }
      case "blockquote_open": {
        if (!top) this.unsupported(token, "A quote");
        const content = this.blocks("quote");
        this.next();
        return { type: "blockquote", content };
      }
      case "bullet_list_open":
      case "ordered_list_open": {
        const ordered = token.type === "ordered_list_open";
        const items: RichTextNode[] = [];
        while (this.peek()?.type === "list_item_open") {
          this.next();
          const content = this.blocks("item");
          this.next();
          if (content[0]?.type !== "paragraph") content.unshift({ type: "paragraph" });
          const merged: RichTextNode[] = [content[0]!];
          for (const child of content.slice(1)) {
            if (child.type === "paragraph") {
              const first = merged[0]!;
              first.content = [...(first.content ?? []), { type: "hardBreak" }, ...(child.content ?? [])];
            } else merged.push(child);
          }
          items.push({ type: "listItem", content: merged });
        }
        this.next();
        return { type: ordered ? "orderedList" : "bulletList", content: items };
      }
      case "fence":
      case "code_block": {
        if (!top) this.unsupported(token, "A code block");
        const language = token.type === "fence" ? token.info.trim().split(/\s+/)[0] : "";
        const code = token.content.replace(/\n$/, "");
        return { type: "codeBlock", ...(language ? { attrs: { language } } : {}), ...(code ? { content: [{ type: "text", text: code }] } : {}) };
      }
      case "hr":
        if (!top) this.unsupported(token, "A rule");
        return { type: "horizontalRule" };
      case "table_open":
        if (!top) this.unsupported(token, "A table");
        return this.table();
      case "directive":
        if (!top) this.unsupported(token, "A block");
        return parseDirective(token.content, lineOf(token) ?? 0);
      case "html_block": {
        if (token.content.trim() === "<!-- -->") return null;
        const text = token.content.trim();
        return text ? { type: "paragraph", content: [{ type: "text", text }] } : null;
      }
      default:
        throw new MarkdownError(`"${token.type}" is not supported`, lineOf(token));
    }
  }

  private table(): RichTextNode {
    const rows: RichTextNode[] = [];
    let header = false;
    while (!this.done) {
      const token = this.next();
      if (token.type === "table_close") break;
      if (token.type === "tr_open") rows.push({ type: "tableRow", content: [] });
      else if (token.type === "th_open" || token.type === "td_open") {
        const isHeader = token.type === "th_open";
        if (isHeader) header = true;
        const inline = this.next();
        this.next();
        const cell = paragraph(inline);
        rows[rows.length - 1]!.content!.push({ type: isHeader ? "tableHeader" : "tableCell", content: [cell] });
      }
    }
    const first = rows[0];
    const blank = header && first?.content?.every((c) => !c.content?.[0]?.content?.length);
    if (header && blank && rows.length > 1) rows.shift();
    else if (header && blank) first!.content = first!.content!.map((c) => ({ ...c, type: "tableCell" }));
    return { type: "table", content: rows };
  }
}

/**
 * Markdown to a stored document. Throws `MarkdownError` for syntax the
 * vocabulary has no place for and `RichTextError` when the result breaks the
 * schema (an unsafe link, a picture with no alt text).
 */
export function markdownToDoc(source: string): RichTextDoc {
  parser ??= makeParser();
  const tokens = parser.parse(source.replace(/\r\n?/g, "\n"), {});
  const reader = new Reader(tokens);
  const content = reader.blocks("doc");
  if (!reader.done) throw new MarkdownError("Unexpected structure");
  return parseRichTextDoc(normaliseEditorDoc({ type: "doc", content }));
}

/** The message to show beside the Markdown box, whichever error it was. */
export function markdownErrorMessage(error: unknown): string {
  if (error instanceof MarkdownError) return error.message;
  if (error instanceof RichTextError) return error.message.replace(/^Invalid rich text at /, "");
  return error instanceof Error ? error.message : String(error);
}
