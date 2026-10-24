import { CUSTOM_NODES, parseRichTextDoc, RichTextError } from "./schema";
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
    default:
      return undefined;
  }
}

function cleanMark(mark: unknown): RichTextMark | null {
  if (!isRecord(mark)) return null;
  if (mark.type === "link") return { type: "link", attrs: { href: str(isRecord(mark.attrs) ? mark.attrs.href : "") } };
  return { type: str(mark.type) };
}

function cleanNode(node: unknown, topLevel: boolean): RichTextNode | null {
  if (!isRecord(node)) return null;
  const type = str(node.type);
  if (type === "text") {
    const marks = (Array.isArray(node.marks) ? node.marks : []).map(cleanMark).filter((m): m is RichTextMark => m !== null);
    return { type, text: str(node.text), ...(marks.length ? { marks } : {}) };
  }
  const content = (Array.isArray(node.content) ? node.content : [])
    .map((child) => cleanNode(child, false))
    .filter((child): child is RichTextNode => child !== null);
  if (type === "paragraph" && topLevel && content.length === 0) return null;
  const attrs = cleanAttrs(type, node.attrs);
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
