/**
 * Word, character and reading-time figures for the editor's status bar. Thai
 * has no spaces between words, so words are counted with `Intl.Segmenter` and
 * its word granularity rather than by splitting on whitespace.
 */

export interface TextStats {
  words: number;
  characters: number;
  /** Whole minutes, at least 1 when there is any text. */
  minutes: number;
}

/** Adults read about 200 words a minute; used for both languages so the two figures can be compared. */
export const WORDS_PER_MINUTE = 200;

const segmenters = new Map<string, Intl.Segmenter | null>();

function segmenterFor(lang: string): Intl.Segmenter | null {
  if (!segmenters.has(lang)) {
    try {
      segmenters.set(lang, typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(lang, { granularity: "word" }) : null);
    } catch {
      segmenters.set(lang, null);
    }
  }
  return segmenters.get(lang) ?? null;
}

export function countWords(text: string, lang: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const segmenter = segmenterFor(lang);
  if (!segmenter) return trimmed.split(/\s+/).length;
  let n = 0;
  for (const part of segmenter.segment(trimmed)) if (part.isWordLike) n++;
  return n;
}

export function textStats(text: string, lang: string): TextStats {
  const words = countWords(text, lang);
  return { words, characters: [...text.trim()].length, minutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) };
}
