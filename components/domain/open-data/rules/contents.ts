/**
 * The contents list of a transcription: chapters and parts with the clauses each holds, or the
 * report headings. It reads the Markdown as stored and returns it with an anchor in front of each
 * listed heading, so the text itself is untouched.
 */

export interface ContentsEntry {
  id: string;
  label: string;
  first: number | null;
  last: number | null;
  children: ContentsEntry[];
}

export interface Contents {
  /** The Markdown with `<a id>` anchors added before the listed headings. */
  markdown: string;
  /** Clauses that come before the first listed heading. */
  intro: { id: string; first: number; last: number } | null;
  entries: ContentsEntry[];
}

interface ContentsRules {
  prefix: string;
  /** True for a heading that is listed at the top level. */
  top: (text: string, level: number) => boolean;
  /** True for a heading that is listed under the last top level entry. */
  child: (text: string, level: number) => boolean;
  /** True when a heading is only the start of a title that continues in the next heading. */
  joinsNext: (text: string, next: string) => boolean;
}

const HEADING_LINE = /^(#{1,6})[ \t]+(.*?)[ \t#]*$/;
const CLAUSE_ANCHOR = /<a id="clause-(\d+)"><\/a>/g;
const BARE_NUMBER_HEADING = /^(หมวด|ส่วนที่|ลักษณะ|Chapter|Part)\s*[0-9๐-๙]+\s*$/;
const PART = /^(ส่วนที่|Part)\s/;
const CHAPTER = /^(หมวด|ลักษณะ|บทเฉพาะกาล|Chapter|Transitory|Transitional)/;

const RULE_RULES: ContentsRules = {
  prefix: "ch",
  top: (text) => CHAPTER.test(text),
  child: (text) => PART.test(text),
  joinsNext: (text) => BARE_NUMBER_HEADING.test(text),
};

const REPORT_RULES = (depth: 1 | 2): ContentsRules => ({
  prefix: "s",
  top: (text, level) => level === 2 && !/^(เรื่อง|สารบัญ)/.test(text),
  child: (_text, level) => depth === 2 && level === 3,
  joinsNext: (text, next) => /^ประกาศ/.test(text) && /^เรื่อง/.test(next),
});

function build(markdown: string, rules: ContentsRules): Contents {
  const lines = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const entries: ContentsEntry[] = [];
  const found: { intro: Contents["intro"] } = { intro: null };
  let top: ContentsEntry | null = null;
  let child: ContentsEntry | null = null;
  let counter = 0;

  const touch = (entry: ContentsEntry | null, n: number) => {
    if (!entry) return;
    entry.first = entry.first === null ? n : Math.min(entry.first, n);
    entry.last = entry.last === null ? n : Math.max(entry.last, n);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const heading = HEADING_LINE.exec(line);
    if (heading?.[1] !== undefined) {
      const level = heading[1].length;
      let text = (heading[2] ?? "").trim();
      const isChild = rules.child(text, level);
      const isTop = !isChild && rules.top(text, level);
      if (isTop || isChild) {
        const next = lines.slice(i + 1).find((l) => l.trim() !== "");
        const following = next ? HEADING_LINE.exec(next) : null;
        const followingText = following?.[2]?.trim();
        if (followingText && rules.joinsNext(text, followingText)) text = `${text} ${followingText}`;
        counter += 1;
        const entry: ContentsEntry = { id: `${rules.prefix}-${counter}`, label: text, first: null, last: null, children: [] };
        lines[i] = `<a id="${entry.id}"></a>${line}`;
        if (isTop || !top) {
          entries.push(entry);
          top = entry;
          child = null;
        } else {
          top.children.push(entry);
          child = entry;
        }
      }
      continue;
    }
    for (const match of line.matchAll(CLAUSE_ANCHOR)) {
      const n = Number.parseInt(match[1] ?? "", 10);
      if (Number.isNaN(n)) continue;
      if (top === null) {
        const current = found.intro;
        found.intro = current ? { id: current.id, first: Math.min(current.first, n), last: Math.max(current.last, n) } : { id: `clause-${n}`, first: n, last: n };
      } else {
        touch(top, n);
        touch(child, n);
      }
    }
  }
  return { markdown: lines.join("\n"), intro: found.intro, entries };
}

/** Chapters and parts of a regulation. */
export function ruleContents(markdown: string): Contents {
  return build(markdown, RULE_RULES);
}

/** Headings of a report: the main headings, with the numbered sections under them when `depth` is 2. */
export function reportContents(markdown: string, depth: 1 | 2): Contents {
  return build(markdown, REPORT_RULES(depth));
}
