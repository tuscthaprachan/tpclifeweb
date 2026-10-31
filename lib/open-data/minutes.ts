/**
 * Recognises the parts of a record of proceedings (minutes) in the parsed transcription, so the
 * page can set them out the way Hansard does: each contribution under the speaker's name and
 * role, agenda items as sections, resolutions and division results set apart. Detection only
 * labels blocks; it never changes, drops or reorders any text. No React, so it runs in tests.
 */

import { inlineText, type Block, type Inline, type TableCell } from "./markdown";

export interface Contribution {
  /** The speaker's name and role, up to but not including the speech verb. */
  prefix: string;
  /** Everything after the prefix, as written. */
  rest: Inline[];
}

export interface Division {
  /** The printed header cells, or null when the header row is empty. */
  head: TableCell[] | null;
  /** The printed label, number and unit of each row, in order. */
  rows: Array<{ label: TableCell; figure: TableCell; unit: TableCell | null }>;
}

export type MinutesKind =
  | { k: "plain" }
  | { k: "contribution"; contribution: Contribution }
  | { k: "agenda"; level: "item" | "sub" }
  | { k: "resolution" }
  | { k: "division"; division: Division }
  | { k: "time" }
  | { k: "signature"; first: boolean };

const SPEECH_VERB = /(?:\s|(?<=ประชุม))(?:ได้)?(?:กล่าว|ชี้แจง|สอบถาม|ถาม|ตอบ|อภิปราย|เสนอ|ให้|ขึ้นปฏิบัติ|แจ้ง|รายงาน|ตนขอ)/;
const MAX_PREFIX = 240;
const VOTE_LABEL = /^(?:รับรอง|ไม่รับรอง|เห็นชอบ|ไม่เห็นชอบ|งดออกเสียง|องค์ประชุม|สมาชิกผู้ลงมติ.*)$/;
const FIGURE = /^[0-9๐-๙]+$/;
const UNIT = /^(?:เสียง|คน)(?: ดังนี้)?$/;
const TIME_LINE = /^(?:เริ่มประชุมเวลา|ปิดการประชุมเวลา)/;
const SIGNATURE_START = /^\[ลายมือชื่อ\]/;
const RESOLUTION = /^มติที่ประชุม/;

/** Splits a speaker paragraph ("คุณ... <role> กล่าวว่า ...") into the speaker prefix and the rest. */
export function splitContribution(content: Inline[]): Contribution | null {
  const first = content[0];
  if (!first || first.t !== "text" || !first.v.startsWith("คุณ")) return null;
  const match = SPEECH_VERB.exec(first.v);
  if (!match || match.index === 0 || match.index > MAX_PREFIX) return null;
  const prefix = first.v.slice(0, match.index);
  if (prefix.trim().split(/\s+/).length < 2) return null;
  return { prefix, rest: [{ t: "text", v: first.v.slice(match.index) }, ...content.slice(1)] };
}

function cellText(cell: TableCell | undefined): string {
  return cell ? inlineText(cell.c).trim() : "";
}

/** A table of vote categories with a figure each ("รับรอง | 16 | เสียง"), or null when it is anything else. */
export function asDivision(block: Extract<Block, { t: "table" }>): Division | null {
  if (block.rows.length === 0 || block.head.length !== 3) return null;
  const rows: Division["rows"] = [];
  for (const row of block.rows) {
    const [label, figure, unit] = row;
    if (row.length !== 3 || !label || !figure || !unit) return null;
    if (!VOTE_LABEL.test(cellText(label)) || !FIGURE.test(cellText(figure))) return null;
    const unitText = cellText(unit);
    if (unitText !== "" && !UNIT.test(unitText)) return null;
    rows.push({ label, figure, unit });
  }
  return { head: block.head.some((cell) => cellText(cell) !== "") ? block.head : null, rows };
}

function firstStrongText(content: Inline[]): string | null {
  const first = content[0];
  return first && first.t === "strong" ? inlineText(first.c).trim() : null;
}

export function classifyMinutes(blocks: Block[]): MinutesKind[] {
  const kinds: MinutesKind[] = [];
  let inSignature = false;
  for (const block of blocks) {
    if (block.t !== "paragraph") inSignature = false;

    if (block.t === "heading") {
      const ids = block.ids.filter((id) => /^item-\d/.test(id));
      const top = ids.some((id) => /^item-\d+$/.test(id));
      kinds.push(ids.length > 0 ? { k: "agenda", level: top ? "item" : "sub" } : { k: "plain" });
      continue;
    }

    if (block.t === "table") {
      const division = asDivision(block);
      kinds.push(division ? { k: "division", division } : { k: "plain" });
      continue;
    }

    if (block.t !== "paragraph") {
      kinds.push({ k: "plain" });
      continue;
    }

    const text = inlineText(block.c).trim();
    if (SIGNATURE_START.test(text)) {
      kinds.push({ k: "signature", first: true });
      inSignature = true;
      continue;
    }
    if (inSignature) {
      kinds.push({ k: "signature", first: false });
      continue;
    }
    if (RESOLUTION.test(firstStrongText(block.c) ?? "")) {
      kinds.push({ k: "resolution" });
      continue;
    }
    if (TIME_LINE.test(text)) {
      kinds.push({ k: "time" });
      continue;
    }
    const contribution = splitContribution(block.c);
    kinds.push(contribution ? { k: "contribution", contribution } : { k: "plain" });
  }
  return kinds;
}
