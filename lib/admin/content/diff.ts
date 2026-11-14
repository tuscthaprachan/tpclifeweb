/**
 * Field-level comparison of two revision snapshots. Pure and client safe: the
 * history page runs it on the server, tests run it on plain objects.
 *
 * A snapshot is what `saveContent` stores: `{ row, ...children }`, where `row`
 * is the content row as JSON and each child key holds an array of rows. Fields
 * named `fooTh` and `fooEn` are paired into one bilingual field so the page
 * can show both languages side by side. Rich text is compared as plain text
 * paragraphs.
 */

export type DiffOpType = "same" | "add" | "remove";

export interface DiffOp {
  type: DiffOpType;
  text: string;
}

export type FieldKind = "text" | "richText" | "list" | "data";

export interface DiffSide {
  /** Absent for a field that is not bilingual. */
  locale?: "th" | "en";
  before: string[];
  after: string[];
  /** Line by line for paragraphs and lists, word by word for a short text field. */
  ops: DiffOp[];
  changed: boolean;
}

export interface FieldDiff {
  /** The column name without a language suffix, or the child key. */
  key: string;
  kind: FieldKind;
  sides: DiffSide[];
  changed: boolean;
}

export interface SnapshotDiff {
  fields: FieldDiff[];
  changedCount: number;
}

const IGNORED = new Set(["id", "createdAt", "updatedAt", "createdBy", "updatedBy"]);
const CHILD_HIDDEN = new Set(["id", "position"]);

interface RichNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
}

export function isRichTextDoc(value: unknown): value is { type: "doc"; content: RichNode[] } {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "doc" && Array.isArray((value as { content?: unknown }).content);
}

/** One entry per text block (paragraph, heading, list item, table cell) and one marker per block with no text of its own (an image, a form card). */
export function richTextParagraphs(doc: unknown): string[] {
  if (!isRichTextDoc(doc)) return [];
  const out: string[] = [];
  const textOf = (node: RichNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return " ";
    return (node.content ?? []).map(textOf).join("");
  };
  const walk = (nodes: RichNode[] | undefined) => {
    for (const node of nodes ?? []) {
      const children = node.content ?? [];
      if (children.some((c) => c.type === "text" || c.type === "hardBreak")) {
        const text = textOf(node).replace(/\s+/g, " ").trim();
        if (text) out.push(text);
      } else if (children.length > 0) {
        walk(children);
      } else if (node.type && node.type !== "text") {
        const attrs = Object.entries(node.attrs ?? {})
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(", ");
        out.push(attrs ? `[${node.type}: ${attrs}]` : `[${node.type}]`);
      }
    }
  };
  walk(doc.content);
  return out;
}

/** Longest common subsequence diff over two lists of strings. */
export function diffSequences(before: readonly string[], after: readonly string[]): DiffOp[] {
  const n = before.length;
  const m = after.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = before[i] === after[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      ops.push({ type: "same", text: before[i]! });
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      ops.push({ type: "remove", text: before[i++]! });
    } else {
      ops.push({ type: "add", text: after[j++]! });
    }
  }
  while (i < n) ops.push({ type: "remove", text: before[i++]! });
  while (j < m) ops.push({ type: "add", text: after[j++]! });
  return ops;
}

/** Joins runs of the same kind so "a b" removed then "c" removed reads as one removal. */
function coalesce(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else out.push({ ...op });
  }
  return out;
}

function tokens(text: string): string[] {
  if (text === "") return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return [...segmenter.segment(text)].map((s) => s.segment);
  }
  return text.split(/(\s+)/).filter((t) => t !== "");
}

/** Word by word, for one short string against another. Whitespace between changed words stays with the change. */
export function diffWords(before: string, after: string): DiffOp[] {
  return coalesce(diffSequences(tokens(before), tokens(after)));
}

const scalar = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

function describeItem(item: unknown): string {
  if (typeof item !== "object" || item === null) return scalar(item);
  return Object.entries(item as Record<string, unknown>)
    .filter(([k]) => !CHILD_HIDDEN.has(k))
    .map(([, v]) => scalar(v))
    .filter((v) => v !== "")
    .join(" | ");
}

function linesOf(value: unknown): { kind: FieldKind; lines: string[] } {
  if (isRichTextDoc(value)) return { kind: "richText", lines: richTextParagraphs(value) };
  if (Array.isArray(value)) return { kind: "list", lines: value.map(describeItem) };
  if (typeof value === "object" && value !== null) return { kind: "data", lines: JSON.stringify(value, null, 2).split("\n") };
  const text = scalar(value);
  return { kind: "text", lines: text === "" ? [] : text.split("\n") };
}

function side(locale: DiffSide["locale"], before: unknown, after: unknown): { side: DiffSide; kind: FieldKind } {
  const b = linesOf(before);
  const a = linesOf(after);
  const kind = a.kind === "text" && b.kind !== "text" ? b.kind : a.kind;
  const same = b.lines.length === a.lines.length && b.lines.every((line, i) => line === a.lines[i]);
  let ops: DiffOp[];
  if (same) ops = a.lines.map((text) => ({ type: "same", text }));
  else if (kind === "text" && b.lines.length <= 1 && a.lines.length <= 1) ops = diffWords(b.lines[0] ?? "", a.lines[0] ?? "");
  else ops = diffSequences(b.lines, a.lines);
  return { side: { locale, before: b.lines, after: a.lines, ops, changed: !same }, kind };
}

/** Compares two snapshots. `before` may be undefined (nothing to compare with): every field then reads as added. */
export function diffSnapshots(before: unknown, after: unknown): SnapshotDiff {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const bRow = (b.row ?? {}) as Record<string, unknown>;
  const aRow = (a.row ?? {}) as Record<string, unknown>;

  const rowKeys = [...new Set([...Object.keys(aRow), ...Object.keys(bRow)])].filter((k) => !IGNORED.has(k));
  const rowKeySet = new Set(rowKeys);
  const fields: FieldDiff[] = [];
  const consumed = new Set<string>();

  for (const key of rowKeys) {
    if (consumed.has(key)) continue;
    const match = /^(.+?)(Th|En)$/.exec(key);
    const partner = match ? `${match[1]}${match[2] === "Th" ? "En" : "Th"}` : null;
    if (match && partner && rowKeySet.has(partner)) {
      const base = match[1]!;
      consumed.add(key).add(partner);
      const th = side("th", bRow[`${base}Th`], aRow[`${base}Th`]);
      const en = side("en", bRow[`${base}En`], aRow[`${base}En`]);
      fields.push({ key: base, kind: th.kind === "text" ? en.kind : th.kind, sides: [th.side, en.side], changed: th.side.changed || en.side.changed });
      continue;
    }
    const one = side(undefined, bRow[key], aRow[key]);
    fields.push({ key, kind: one.kind, sides: [one.side], changed: one.side.changed });
  }

  const childKeys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k !== "row" && k !== "deleted");
  for (const key of childKeys) {
    const one = side(undefined, b[key] ?? [], a[key] ?? []);
    fields.push({ key, kind: "list", sides: [one.side], changed: one.side.changed });
  }

  return { fields, changedCount: fields.filter((f) => f.changed).length };
}

/** The columns a restore writes back, from a snapshot's row. */
export function restorableRow(snapshot: unknown): Record<string, unknown> | null {
  const row = (snapshot as { row?: unknown } | null)?.row;
  if (typeof row !== "object" || row === null) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (!IGNORED.has(key)) out[key] = value;
  }
  return out;
}
