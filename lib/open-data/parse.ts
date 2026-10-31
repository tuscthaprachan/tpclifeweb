/**
 * Parsers for the open data source files. No server-only import: they run
 * under tsx (seed, mirror script) and in tests.
 */

export interface FrontMatter {
  fields: Record<string, string>;
  body: string;
}

const CLOSING_FENCE = /(?:^|\r?\n)---[ \t]*(?:\r?\n|$)/;

function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === '"' && last === '"') {
      return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
    }
    if (first === "'" && last === "'") {
      return value.slice(1, -1).replace(/''/g, "'");
    }
  }
  return value;
}

/**
 * Splits a transcript into its front matter and body. Values are read as
 * written: blank stays "", quotes are removed, bracketed markers and colons
 * inside a value are kept. The body is everything after the closing fence,
 * untouched. A file with no front matter is all body.
 */
export function parseFrontMatter(source: string): FrontMatter {
  const text = source.replace(/^\uFEFF/, "");
  if (!/^---[ \t]*\r?\n/.test(text)) return { fields: {}, body: text };
  const afterOpen = text.replace(/^---[ \t]*\r?\n/, "");
  const close = CLOSING_FENCE.exec(afterOpen);
  if (!close) return { fields: {}, body: text };
  const block = afterOpen.slice(0, close.index);
  const body = afterOpen.slice(close.index + close[0].length);
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = /^([A-Za-z_][\w-]*)[ \t]*:(.*)$/.exec(line);
    if (match?.[1] !== undefined) fields[match[1]] = unquote(match[2] ?? "");
  }
  return { fields, body };
}

/** RFC 4180 CSV with an optional byte order mark. Returns objects keyed by the header row. */
export function parseCsv(source: string): Array<Record<string, string>> {
  const text = source.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  if (!header) return [];
  return data.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
}

const MARKER = /^\[[^\]]*\]$/;

/** True for a spelled-out marker such as "[not stated]". */
export function isMarker(value: string): boolean {
  return MARKER.test(value.trim());
}

/** Text as printed; a blank cell is null. */
export function textOrNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

/** A complete ISO date, or null for a marker, blank or partial date. */
export function isoDateOrNull(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** A whole number, or null for a marker or blank. */
export function intOrNull(value: string | undefined): number | null {
  const v = (value ?? "").trim();
  return /^-?\d+$/.test(v) ? Number.parseInt(v, 10) : null;
}
