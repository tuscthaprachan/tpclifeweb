import type { RichTextDoc, RichTextMark, RichTextNode } from "./types";

/**
 * Portable Text to ProseMirror JSON, for the seed scripts and any one-off
 * import. Call it once per language (`portableTextToDoc(body.th)`); the
 * custom blocks keep their bilingual `{ th, en }` attrs, see `schema.ts`.
 *
 * It throws on anything outside the vocabulary the old schema allowed
 * (`sanity/schemas/objects/portableText.ts`) rather than dropping it, so a
 * lossy conversion is a loud failure at seed time. The result is not
 * validated here; run `parseRichTextDoc` on it before storing.
 */

export interface PortableTextConvertOptions {
  /**
   * Portable Text references Sanity ids, which do not exist in the new
   * database. Map them to the new row ids here. Default: pass through.
   */
  mapImageId?: (sanityAssetRef: string) => string;
  mapFormId?: (sanityFormRef: string) => string;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(block: unknown, index: number): string {
  if (!isRecord(block)) return `block ${index} (not an object)`;
  return `block ${index} (_type ${JSON.stringify(block._type)}, _key ${JSON.stringify(block._key)})`;
}

const HEADING_STYLES: Record<string, number> = { h2: 2, h3: 3, h4: 4 };
const DECORATORS: Record<string, string> = { strong: "bold", em: "italic" };

/** Spans to inline nodes: marks mapped, `\n` to hardBreak, empty text dropped. */
function convertSpans(block: Raw, where: string): RichTextNode[] {
  const markDefs = new Map<string, Raw>();
  for (const def of Array.isArray(block.markDefs) ? block.markDefs : []) {
    if (isRecord(def) && typeof def._key === "string") markDefs.set(def._key, def);
  }

  const out: RichTextNode[] = [];
  for (const child of Array.isArray(block.children) ? block.children : []) {
    if (!isRecord(child) || child._type !== "span") {
      throw new Error(`portableTextToDoc: unsupported inline type ${JSON.stringify(isRecord(child) ? child._type : child)} in ${where}`);
    }
    const marks: RichTextMark[] = [];
    for (const name of Array.isArray(child.marks) ? child.marks : []) {
      if (typeof name !== "string") throw new Error(`portableTextToDoc: mark must be a string in ${where}`);
      const decorator = DECORATORS[name];
      if (decorator) {
        marks.push({ type: decorator });
        continue;
      }
      const def = markDefs.get(name);
      if (!def) throw new Error(`portableTextToDoc: unknown mark ${JSON.stringify(name)} in ${where}`);
      if (def._type !== "link" || typeof def.href !== "string") {
        throw new Error(`portableTextToDoc: unsupported annotation ${JSON.stringify(def._type)} in ${where}`);
      }
      marks.push({ type: "link", attrs: { href: def.href } });
    }

    const parts = String(child.text ?? "").split("\n");
    parts.forEach((part, i) => {
      if (i > 0) out.push({ type: "hardBreak" });
      if (part.length > 0) out.push({ type: "text", text: part, ...(marks.length ? { marks } : {}) });
    });
  }
  return out;
}

function withContent(type: string, content: RichTextNode[], attrs?: Raw): RichTextNode {
  return { type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) };
}

/** A Sanity `localeString`/`localeText` as plain `{ th, en }`, without `_type`. Undefined stays undefined. */
function loc(value: unknown, where: string): { th: string; en: string } | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error(`portableTextToDoc: malformed locale value in ${where}`);
  return { th: String(value.th ?? ""), en: String(value.en ?? "") };
}

/** Drops keys whose value is undefined/null, so optional attrs stay absent. */
function compact(attrs: Raw): Raw {
  return Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null));
}

function convertCustom(block: Raw, where: string, options: PortableTextConvertOptions): RichTextNode {
  switch (block._type) {
    case "siteImage": {
      const asset = isRecord(block.asset) ? block.asset : undefined;
      const ref = typeof asset?._ref === "string" ? asset._ref : undefined;
      if (!ref) throw new Error(`portableTextToDoc: image has no asset reference in ${where}`);
      return {
        type: "image",
        attrs: compact({
          imageId: (options.mapImageId ?? ((id) => id))(ref),
          isDecorative: block.isDecorative === true,
          alt: loc(block.alt, where),
          caption: loc(block.caption, where),
        }),
      };
    }
    case "formCallout": {
      const form = isRecord(block.form) ? block.form : undefined;
      const ref = typeof form?._ref === "string" ? form._ref : typeof form?._id === "string" ? form._id : undefined;
      if (!ref) throw new Error(`portableTextToDoc: form callout has no form reference in ${where}`);
      return { type: "formCallout", attrs: { formId: (options.mapFormId ?? ((id) => id))(ref) } };
    }
    case "linkOut":
      return {
        type: "linkOut",
        attrs: compact({ label: loc(block.label, where), url: block.url, description: loc(block.description, where), requiresSignIn: block.requiresSignIn === true }),
      };
    case "calloutBox":
      return { type: "calloutBox", attrs: compact({ tone: block.tone ?? "info", title: loc(block.title, where), body: loc(block.body, where) }) };
    case "stepList": {
      const steps = Array.isArray(block.steps) ? block.steps : [];
      return {
        type: "stepList",
        attrs: compact({
          title: loc(block.title, where),
          steps: steps.map((step) => {
            if (!isRecord(step)) throw new Error(`portableTextToDoc: malformed step in ${where}`);
            return compact({ title: loc(step.title, where), detail: loc(step.detail, where) });
          }),
        }),
      };
    }
    case "contactBlock":
      return {
        type: "contactBlock",
        attrs: compact({ label: loc(block.label, where), channel: block.channel, value: block.value, hours: loc(block.hours, where) }),
      };
    default:
      throw new Error(`portableTextToDoc: unsupported block type ${JSON.stringify(block._type)} in ${where}`);
  }
}

interface OpenList {
  level: number;
  type: "bulletList" | "orderedList";
  node: RichTextNode;
}

export function portableTextToDoc(blocks: readonly unknown[] | undefined, options: PortableTextConvertOptions = {}): RichTextDoc {
  const root: RichTextNode[] = [];
  /** Open lists, outermost first. A non-list block closes them all. */
  let stack: OpenList[] = [];

  (blocks ?? []).forEach((raw, index) => {
    const where = describe(raw, index);
    if (!isRecord(raw)) throw new Error(`portableTextToDoc: ${where}`);

    if (raw._type !== "block") {
      stack = [];
      root.push(convertCustom(raw, where, options));
      return;
    }

    const inline = convertSpans(raw, where);
    const style = typeof raw.style === "string" ? raw.style : "normal";

    if (raw.listItem !== undefined) {
      const listType = raw.listItem === "bullet" ? "bulletList" : raw.listItem === "number" ? "orderedList" : undefined;
      if (!listType) throw new Error(`portableTextToDoc: unsupported list type ${JSON.stringify(raw.listItem)} in ${where}`);
      if (style !== "normal") throw new Error(`portableTextToDoc: list item with style ${JSON.stringify(style)} in ${where}`);
      const level = Math.max(1, Math.floor(Number(raw.level) || 1));

      while (stack.length > 0 && stack[stack.length - 1]!.level > level) stack.pop();
      const top = stack[stack.length - 1];
      if (top && top.level === level && top.type !== listType) stack.pop();

      let open = stack[stack.length - 1];
      if (!open) {
        // Nothing open: start at the top level, even if the first item claims level > 1.
        const node: RichTextNode = { type: listType, content: [] };
        root.push(node);
        open = { level, type: listType, node };
        stack.push(open);
      } else if (open.level < level) {
        const lastItem = open.node.content![open.node.content!.length - 1]!;
        lastItem.content = lastItem.content ?? [];
        const node: RichTextNode = { type: listType, content: [] };
        lastItem.content.push(node);
        open = { level, type: listType, node };
        stack.push(open);
      }
      open.node.content!.push({ type: "listItem", content: [withContent("paragraph", inline)] });
      return;
    }

    stack = [];
    if (style === "normal") root.push(withContent("paragraph", inline));
    else if (style in HEADING_STYLES) root.push(withContent("heading", inline, { level: HEADING_STYLES[style] }));
    else if (style === "blockquote") root.push(withContent("blockquote", [withContent("paragraph", inline)]));
    else throw new Error(`portableTextToDoc: unsupported block style ${JSON.stringify(style)} in ${where}`);
  });

  return { type: "doc", content: root };
}
