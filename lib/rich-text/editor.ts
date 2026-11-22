import { CUSTOM_NODES, MARK_ORDER, parseRichTextDoc, RichTextError } from "./schema";
import type { RichTextDoc, RichTextMark, RichTextNode } from "./types";

/**
 * Bridges what the TipTap editor produces and what `schema.ts` accepts. The
 * editor's JSON carries attributes the stored format does not have (list
 * `start`, link `target`, `null` for every unset optional attr, an empty
 * trailing paragraph), so `normaliseEditorDoc` strips it to the stored shape.
 * It deliberately does not validate: `parseRichTextDoc` is the gate, and
 * runs on the server for every write.
 */

type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function localeStr(v: unknown): { th: string; en: string } {
  const o = isRecord(v) ? v : {};
  return { th: str(o.th), en: str(o.en) };
}

/** An optional bilingual value: omitted when both sides are blank. */
function optLocaleStr(v: unknown): { th: string; en: string } | undefined {
  const s = localeStr(v);
  return s.th.trim() || s.en.trim() ? s : undefined;
}

const defined = (o: Raw): Raw => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function cleanAttrs(type: string, attrs: unknown): Raw | undefined {
  const o = isRecord(attrs) ? attrs : {};
  switch (type) {
    case "heading":
      return { level: o.level };
    case "codeBlock": {
      const language = str(o.language).trim();
      return language ? { language } : undefined;
    }
    case "contactBlock":
      return defined({ label: localeStr(o.label), channel: o.channel, value: str(o.value).trim(), hours: optLocaleStr(o.hours) });
    case "formCallout":
      return { formId: str(o.formId) };
    case "image": {
      const decorative = o.isDecorative === true;
      return defined({
        imageId: str(o.imageId),
        isDecorative: decorative,
        alt: decorative ? undefined : optLocaleStr(o.alt),
        caption: optLocaleStr(o.caption),
      });
    }
    case "linkOut":
      return defined({
        label: localeStr(o.label),
        url: str(o.url).trim(),
        description: optLocaleStr(o.description),
        requiresSignIn: o.requiresSignIn === true,
      });
    case "calloutBox":
      return defined({ tone: o.tone, title: optLocaleStr(o.title), body: localeStr(o.body) });
    case "stepList":
      return defined({
        title: optLocaleStr(o.title),
        steps: (Array.isArray(o.steps) ? o.steps : []).map((s) =>
          defined({ title: localeStr(isRecord(s) ? s.title : undefined), detail: optLocaleStr(isRecord(s) ? s.detail : undefined) }),
        ),
      });
    case "liveTimeline":
      return defined({
        title: optLocaleStr(o.title),
        items: (Array.isArray(o.items) ? o.items : []).map((raw) => {
          const i = isRecord(raw) ? raw : {};
          return defined({ startsAt: str(i.startsAt), endsAt: str(i.endsAt), label: localeStr(i.label), detail: optLocaleStr(i.detail) });
        }),
      });
    case "keyFacts":
      return defined({
        title: optLocaleStr(o.title),
        facts: (Array.isArray(o.facts) ? o.facts : []).map((raw) => {
          const f = isRecord(raw) ? raw : {};
          return { value: localeStr(f.value), label: localeStr(f.label) };
        }),
      });
    default:
      return undefined;
  }
}

function cleanMark(mark: unknown): RichTextMark | null {
  if (!isRecord(mark)) return null;
  if (mark.type === "link") return { type: "link", attrs: { href: str(isRecord(mark.attrs) ? mark.attrs.href : "") } };
  return { type: str(mark.type) };
}

/** Marks in the stored order, each once; code stands alone because the editor's code mark excludes the rest. */
export function canonicalMarks(marks: readonly RichTextMark[]): RichTextMark[] {
  const code = marks.find((m) => m.type === "code");
  if (code) return [{ type: "code" }];
  const seen = new Set<string>();
  const unique = marks.filter((m) => !seen.has(m.type) && seen.add(m.type));
  const rank = (m: RichTextMark) => {
    const i = (MARK_ORDER as readonly string[]).indexOf(m.type);
    return i < 0 ? MARK_ORDER.length : i;
  };
  return [...unique].sort((x, y) => rank(x) - rank(y));
}

const emptyCell = (type: string): RichTextNode => ({ type, content: [{ type: "paragraph" }] });

/** One paragraph per cell: several paragraphs join with line breaks, anything that is not a paragraph is dropped. */
function normaliseCell(cell: RichTextNode, header: boolean): RichTextNode {
  const paragraphs = (cell.content ?? []).filter((c) => c.type === "paragraph");
  const inline: RichTextNode[] = [];
  paragraphs.forEach((p, i) => {
    if (i > 0) inline.push({ type: "hardBreak" });
    inline.push(...(p.content ?? []));
  });
  return { type: header ? "tableHeader" : "tableCell", content: [{ type: "paragraph", ...(inline.length ? { content: inline } : {}) }] };
}

/** Rectangular, no merged cells, headers only across the whole first row. */
function normaliseTable(rows: RichTextNode[]): RichTextNode[] {
  const real = rows.filter((r) => r.type === "tableRow");
  const width = Math.max(1, ...real.map((r) => r.content?.length ?? 0));
  const headerRow = real[0]?.content?.some((c) => c.type === "tableHeader") ?? false;
  return real.map((row, r) => {
    const cells = (row.content ?? []).map((c) => normaliseCell(c, headerRow && r === 0));
    while (cells.length < width) cells.push(emptyCell(headerRow && r === 0 ? "tableHeader" : "tableCell"));
    return { type: "tableRow", content: cells };
  });
}

function cleanNode(node: unknown, topLevel: boolean): RichTextNode | null {
  if (!isRecord(node)) return null;
  const type = str(node.type);
  if (type === "text") {
    const marks = canonicalMarks((Array.isArray(node.marks) ? node.marks : []).map(cleanMark).filter((m): m is RichTextMark => m !== null));
    return { type, text: str(node.text), ...(marks.length ? { marks } : {}) };
  }
  const content = (Array.isArray(node.content) ? node.content : [])
    .map((child) => cleanNode(child, false))
    .filter((child): child is RichTextNode => child !== null);
  if (type === "paragraph" && topLevel && content.length === 0) return null;
  const attrs = cleanAttrs(type, node.attrs);
  if (type === "codeBlock") {
    const code = content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return { type, ...(attrs ? { attrs } : {}), ...(code ? { content: [{ type: "text", text: code }] } : {}) };
  }
  if (type === "table") return { type, content: normaliseTable(content) };
  return { type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) };
}

/** The editor's `getJSON()` as the stored format. Empty top-level paragraphs are dropped, so a blank editor gives an empty document. */
export function normaliseEditorDoc(json: unknown): RichTextDoc {
  const content = isRecord(json) && Array.isArray(json.content) ? json.content : [];
  return {
    type: "doc",
    content: content.map((n) => cleanNode(n, true)).filter((n): n is RichTextNode => n !== null),
  };
}

/** The attrs a new block of each kind starts with in the editor. */
export const BLOCK_DEFAULTS = {
  contactBlock: { label: { th: "", en: "" }, channel: "line", value: "", hours: null },
  formCallout: { formId: "" },
  image: { imageId: "", isDecorative: false, alt: null, caption: null },
  linkOut: { label: { th: "", en: "" }, url: "", description: null, requiresSignIn: false },
  calloutBox: { tone: "info", title: null, body: { th: "", en: "" } },
  stepList: { title: null, steps: [{ title: { th: "", en: "" }, detail: null }] },
  liveTimeline: { title: null, items: [{ startsAt: "", endsAt: "", label: { th: "", en: "" }, detail: null }] },
  keyFacts: { title: null, facts: [{ value: { th: "", en: "" }, label: { th: "", en: "" } }] },
} as const satisfies Record<(typeof CUSTOM_NODES)[number], Raw>;

export type BlockType = (typeof CUSTOM_NODES)[number];

/**
 * Checks one custom block's attrs against the stored vocabulary, for the
 * block dialog. Returns the schema's message, or null when valid.
 */
export function validateBlockAttrs(type: BlockType, attrs: unknown): string | null {
  try {
    parseRichTextDoc({ type: "doc", content: [{ type, attrs: cleanAttrs(type, attrs) }] });
    return null;
  } catch (error) {
    if (error instanceof RichTextError) return error.message.replace(/^Invalid rich text at [^:]+: /, "");
    throw error;
  }
}

export { cleanAttrs as cleanBlockAttrs };
