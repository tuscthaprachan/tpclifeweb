import { z } from "zod";

import type { RichTextDoc, RichTextMark, RichTextNode } from "./types";

/**
 * The rich text vocabulary: every node and mark a stored document may use,
 * named as ProseMirror/TipTap names them so the phase 3 editor reads and
 * writes the same JSON. `parseRichTextDoc` is the one gate: run it on every
 * document before it is written to Postgres and on anything read back that
 * did not come from our own writes. It rejects unknown nodes, unknown marks
 * and unsafe link targets, so the renderer can trust what it is given.
 *
 * Custom blocks keep the bilingual shape Portable Text had (`{ th, en }`
 * objects). Each language still has its own document, so the other side is
 * redundant but harmless, and it keeps the editor's bilingual completeness
 * rule identical to the one the CMS enforced.
 */

/* ------------------------------------------------------------------ *
 * Vocabulary as types
 * ------------------------------------------------------------------ */

export interface LocaleStr {
  th: string;
  en: string;
}

export type CalloutTone = "info" | "warning" | "critical";
export type ContactChannel = "line" | "email" | "phone" | "inPerson" | "url";

/** Block and inline nodes with no custom attrs. */
export const PLAIN_NODES = [
  "doc",
  "paragraph",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "text",
] as const;

/** The six custom block nodes (leaf nodes, no children). */
export const CUSTOM_NODES = ["image", "formCallout", "linkOut", "calloutBox", "stepList", "contactBlock"] as const;

export const MARKS = ["bold", "italic", "link"] as const;

/** Heading levels body copy may use. There is no h1: the page owns it. */
export const HEADING_LEVELS = [2, 3, 4] as const;

export interface ImageAttrs {
  /** Id of a row in the images table; the read layer resolves it. */
  imageId: string;
  isDecorative: boolean;
  /** Required unless `isDecorative` (WCAG 1.1.1). */
  alt?: LocaleStr;
  caption?: LocaleStr;
}
export interface FormCalloutAttrs {
  /** Id of a row in the forms table; the read layer resolves it. */
  formId: string;
}
export interface LinkOutAttrs {
  label: LocaleStr;
  url: string;
  description?: LocaleStr;
  requiresSignIn: boolean;
}
export interface CalloutBoxAttrs {
  tone: CalloutTone;
  title?: LocaleStr;
  body: LocaleStr;
}
export interface StepListAttrs {
  title?: LocaleStr;
  steps: Array<{ title: LocaleStr; detail?: LocaleStr }>;
}
export interface ContactBlockAttrs {
  label: LocaleStr;
  channel: ContactChannel;
  value: string;
  hours?: LocaleStr;
}

/* ------------------------------------------------------------------ *
 * Href safety
 * ------------------------------------------------------------------ */

/**
 * Only http(s), mailto, tel and site-relative paths. Everything else
 * (`javascript:`, `data:`, `vbscript:`, protocol-relative `//host`) is
 * rejected. Control characters and backslashes are refused outright: browsers
 * strip or reinterpret them, which is how `java\tscript:` style bypasses work.
 */
export function isSafeHref(href: string): boolean {
  if (href.length === 0 || href.length > 2048) return false;
  if (/[\u0000-\u001f\u007f\\\s]/.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  if (href.startsWith("#")) return true;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Attr validators
 * ------------------------------------------------------------------ */

const href = z.string().refine(isSafeHref, "Unsafe or malformed link target");
const text = z.string().max(5000);
const localeStr = z.object({ th: text, en: text }).strict();
const optionalLocaleStr = localeStr.optional();

const imageAttrs = z
  .object({
    imageId: z.string().min(1),
    isDecorative: z.boolean().default(false),
    alt: optionalLocaleStr,
    caption: optionalLocaleStr,
  })
  .strict()
  .refine((a) => a.isDecorative || (a.alt && a.alt.th.trim() && a.alt.en.trim()), {
    message: "Image needs alt text in Thai and English, or must be marked decorative",
  });

const formCalloutAttrs = z.object({ formId: z.string().min(1) }).strict();

const linkOutAttrs = z
  .object({
    label: localeStr,
    url: href,
    description: optionalLocaleStr,
    requiresSignIn: z.boolean().default(false),
  })
  .strict();

const calloutBoxAttrs = z
  .object({
    tone: z.enum(["info", "warning", "critical"]),
    title: optionalLocaleStr,
    body: localeStr,
  })
  .strict();

const stepListAttrs = z
  .object({
    title: optionalLocaleStr,
    steps: z.array(z.object({ title: localeStr, detail: optionalLocaleStr }).strict()).min(1).max(100),
  })
  .strict();

const contactBlockAttrs = z
  .object({
    label: localeStr,
    channel: z.enum(["line", "email", "phone", "inPerson", "url"]),
    value: z.string().min(1).max(500),
    hours: optionalLocaleStr,
  })
  .strict()
  .refine((a) => a.channel !== "url" || isSafeHref(a.value), { message: "Contact URL is unsafe or malformed" });

const headingAttrs = z
  .object({ level: z.number().int().refine((n) => (HEADING_LEVELS as readonly number[]).includes(n), "Heading level must be 2 to 4") })
  .strict();

/** TipTap's Link extension also emits these; they are accepted and ignored (the renderer decides new-tab behaviour from the href). */
const linkMarkAttrs = z
  .object({
    href,
    target: z.string().nullish(),
    rel: z.string().nullish(),
    class: z.string().nullish(),
  })
  .strict();

const NODE_ATTRS: Record<string, z.ZodType | undefined> = {
  heading: headingAttrs,
  image: imageAttrs,
  formCallout: formCalloutAttrs,
  linkOut: linkOutAttrs,
  calloutBox: calloutBoxAttrs,
  stepList: stepListAttrs,
  contactBlock: contactBlockAttrs,
};

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

const INLINE = new Set(["text", "hardBreak"]);
const LISTS = new Set(["bulletList", "orderedList"]);
const CUSTOM = new Set<string>(CUSTOM_NODES);

/** Which child node types each parent may hold. Leaf nodes hold none. */
const CHILDREN: Record<string, (type: string) => boolean> = {
  doc: (t) => t === "paragraph" || t === "heading" || t === "blockquote" || LISTS.has(t) || CUSTOM.has(t),
  paragraph: (t) => INLINE.has(t),
  heading: (t) => INLINE.has(t),
  blockquote: (t) => t === "paragraph" || LISTS.has(t),
  bulletList: (t) => t === "listItem",
  orderedList: (t) => t === "listItem",
  listItem: (t) => t === "paragraph" || LISTS.has(t),
};

const KNOWN = new Set<string>([...PLAIN_NODES, "heading", ...CUSTOM_NODES]);
const MAX_DEPTH = 12;
const MAX_NODES = 5000;

export class RichTextError extends Error {
  constructor(message: string, path: string) {
    super(`Invalid rich text at ${path}: ${message}`);
    this.name = "RichTextError";
  }
}

function parseMarks(marks: unknown, path: string): RichTextMark[] | undefined {
  if (marks === undefined) return undefined;
  if (!Array.isArray(marks)) throw new RichTextError("marks must be an array", path);
  return marks.map((raw: unknown, i) => {
    const here = `${path}.marks[${i}]`;
    if (typeof raw !== "object" || raw === null) throw new RichTextError("mark must be an object", here);
    const { type, attrs, ...rest } = raw as Record<string, unknown>;
    if (Object.keys(rest).length > 0) throw new RichTextError(`unexpected field "${Object.keys(rest)[0]}"`, here);
    if (type === "bold" || type === "italic") {
      if (attrs !== undefined && !(typeof attrs === "object" && attrs !== null && Object.keys(attrs).length === 0)) {
        throw new RichTextError(`${type} takes no attrs`, here);
      }
      return { type };
    }
    if (type === "link") {
      const parsed = linkMarkAttrs.safeParse(attrs);
      if (!parsed.success) throw new RichTextError(parsed.error.issues.map((x) => x.message).join("; "), `${here}.attrs`);
      return { type, attrs: { href: parsed.data.href } };
    }
    throw new RichTextError(`unknown mark "${String(type)}"`, here);
  });
}

function parseNode(raw: unknown, parent: string, path: string, depth: number, count: { n: number }): RichTextNode {
  if (depth > MAX_DEPTH) throw new RichTextError("nested too deeply", path);
  if (++count.n > MAX_NODES) throw new RichTextError("too many nodes", path);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new RichTextError("node must be an object", path);

  const { type, attrs, content, text: nodeText, marks, ...rest } = raw as Record<string, unknown>;
  if (Object.keys(rest).length > 0) throw new RichTextError(`unexpected field "${Object.keys(rest)[0]}"`, path);
  if (typeof type !== "string" || !KNOWN.has(type) || type === "doc") {
    throw new RichTextError(`unknown node "${String(type)}"`, path);
  }
  if (!CHILDREN[parent]?.(type)) throw new RichTextError(`"${type}" is not allowed inside "${parent}"`, path);

  const node: RichTextNode = { type };

  const attrSchema = NODE_ATTRS[type];
  if (attrSchema) {
    const parsed = attrSchema.safeParse(attrs);
    if (!parsed.success) {
      throw new RichTextError(parsed.error.issues.map((x) => `${x.path.join(".") || "attrs"}: ${x.message}`).join("; "), `${path}.attrs`);
    }
    node.attrs = parsed.data as Record<string, unknown>;
  } else if (attrs !== undefined && !(typeof attrs === "object" && attrs !== null && Object.keys(attrs).length === 0)) {
    throw new RichTextError(`${type} takes no attrs`, path);
  }

  if (type === "text") {
    if (typeof nodeText !== "string" || nodeText.length === 0) throw new RichTextError("text node needs non-empty text", path);
    node.text = nodeText;
    const m = parseMarks(marks, path);
    if (m && m.length > 0) node.marks = m;
    if (content !== undefined) throw new RichTextError("text node cannot have content", path);
    return node;
  }
  if (nodeText !== undefined || marks !== undefined) throw new RichTextError(`${type} cannot have text or marks`, path);

  if (content !== undefined) {
    if (!Array.isArray(content)) throw new RichTextError("content must be an array", path);
    if (!CHILDREN[type]) throw new RichTextError(`${type} cannot have content`, path);
    if (content.length > 0) {
      node.content = content.map((child, i) => parseNode(child, type, `${path}.content[${i}]`, depth + 1, count));
    }
  }
  if ((type === "bulletList" || type === "orderedList") && !node.content) throw new RichTextError("list needs at least one item", path);
  if (type === "listItem" && node.content?.[0]?.type !== "paragraph") {
    throw new RichTextError("list item must start with a paragraph", path);
  }
  return node;
}

/**
 * Validates untrusted JSON as a `RichTextDoc` and returns a clean copy (only
 * known fields survive). Throws `RichTextError` naming the offending path.
 */
export function parseRichTextDoc(json: unknown): RichTextDoc {
  if (typeof json !== "object" || json === null || Array.isArray(json)) throw new RichTextError("document must be an object", "$");
  const { type, content, ...rest } = json as Record<string, unknown>;
  if (type !== "doc") throw new RichTextError('root must be of type "doc"', "$");
  if (Object.keys(rest).length > 0) throw new RichTextError(`unexpected field "${Object.keys(rest)[0]}"`, "$");
  if (!Array.isArray(content)) throw new RichTextError("doc needs a content array", "$");
  const count = { n: 0 };
  return { type: "doc", content: content.map((child, i) => parseNode(child, "doc", `$.content[${i}]`, 1, count)) };
}

/** True when a document has nothing to render. */
export function isRichTextEmpty(doc: RichTextDoc | null | undefined): boolean {
  return !doc || doc.content.length === 0;
}

/**
 * Every form and image id a document references, so the read layer can fetch
 * them all in two queries before rendering. Walks the tree; safe on any
 * `RichTextDoc` (attrs are read defensively).
 */
export function collectRichTextRefs(doc: RichTextDoc | null | undefined): { formIds: string[]; imageIds: string[] } {
  const formIds = new Set<string>();
  const imageIds = new Set<string>();
  const walk = (nodes: readonly RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      const id = node.attrs?.[node.type === "formCallout" ? "formId" : "imageId"];
      if (typeof id === "string") (node.type === "formCallout" ? formIds : node.type === "image" ? imageIds : new Set()).add(id);
      walk(node.content);
    }
  };
  walk(doc?.content);
  return { formIds: [...formIds], imageIds: [...imageIds] };
}
