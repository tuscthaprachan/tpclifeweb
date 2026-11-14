/**
 * A small, pure before/after comparison for the audit log. Both sides are
 * flattened to dotted paths (`address.city`, `roles.0`) and compared by value,
 * so a nested change is one readable row. A missing `before` means the entry
 * created the record (every field is added); a missing `after` means it was
 * deleted (every field is removed).
 */

export type DiffKind = "added" | "removed" | "changed";

export interface DiffRow {
  path: string;
  kind: DiffKind;
  before: string | null;
  after: string | null;
}

const MAX_VALUE_LENGTH = 400;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/** A value as one line of text: strings as they are, everything else as compact JSON, long values cut. */
export function formatDiffValue(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) text = "null";
  else if (typeof value === "string") text = value;
  else if (value instanceof Date) text = value.toISOString();
  else text = JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}...` : text;
}

/** Leaf values by dotted path. Empty objects and arrays are leaves so they are not lost. */
export function flatten(value: unknown, prefix = "", out: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value) && value.length > 0) {
    value.forEach((child, index) => flatten(child, prefix ? `${prefix}.${index}` : String(index), out));
  } else {
    out.set(prefix, value);
  }
  return out;
}

function same(x: unknown, y: unknown): boolean {
  return JSON.stringify(x) === JSON.stringify(y);
}

/** The rows that differ between `before` and `after`, in path order. Unchanged fields are left out. */
export function diffRecords(before: unknown, after: unknown): DiffRow[] {
  const left = before === null || before === undefined ? new Map<string, unknown>() : flatten(before);
  const right = after === null || after === undefined ? new Map<string, unknown>() : flatten(after);
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort((x, y) => x.localeCompare(y, "en"));
  const rows: DiffRow[] = [];
  for (const path of paths) {
    const hasLeft = left.has(path);
    const hasRight = right.has(path);
    const label = path === "" ? "value" : path;
    if (hasLeft && hasRight) {
      if (!same(left.get(path), right.get(path))) rows.push({ path: label, kind: "changed", before: formatDiffValue(left.get(path)), after: formatDiffValue(right.get(path)) });
    } else if (hasRight) {
      rows.push({ path: label, kind: "added", before: null, after: formatDiffValue(right.get(path)) });
    } else {
      rows.push({ path: label, kind: "removed", before: formatDiffValue(left.get(path)), after: null });
    }
  }
  return rows;
}
