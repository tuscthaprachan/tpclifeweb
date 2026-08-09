/**
 * Script-aware tokenisation for the search engine.
 *
 * Thai text has no spaces between words: "รถรับส่งท่าพระจันทร์" is several
 * words run together with no delimiter. Splitting on whitespace produces one
 * useless token; naive substring matching produces false positives across
 * word boundaries. `Intl.Segmenter("th", { granularity: "word" })` performs
 * real dictionary-based word segmentation and is available in every current
 * Chrome, Safari and Firefox, so it is the primary path.
 *
 * Where `Intl.Segmenter` does not exist, Thai text degrades to character
 * trigrams (a sliding window of three code points) rather than breaking.
 * Trigram matching is weaker than word matching, so the engine in
 * `lib/search/index.ts` treats it as the lowest-confidence tier and uses it
 * both as that genuine fallback and, always, as a secondary signal for
 * partial and fuzzy matches even when word segmentation succeeded.
 *
 * A `SearchRecord.haystack` concatenates BOTH languages into one string
 * (see lib/sanity/queries.ts), so a single call to `tokenise` must cope with
 * a string that mixes Thai and Latin script, for example a Thai sentence
 * that contains the English test name "TU-GET". This is handled by walking
 * the text in runs of consecutive Thai / non-Thai characters and tokenising
 * each run with the method appropriate to its script, rather than trusting
 * one blanket strategy for the whole string.
 *
 * Pure and side-effect free: no I/O, no module-level state.
 */

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export interface TokeniseResult {
  /** Word-level tokens: Thai words from Intl.Segmenter, Latin words from a whitespace/punctuation split. Lowercased for Latin; Thai has no case, so Thai tokens are left exactly as segmented. */
  words: string[];
  /**
   * Character trigrams. Always populated for Thai runs (used as the
   * lowest-confidence match tier even when `words` also has content, and as
   * the ONLY signal for a Thai run when Intl.Segmenter is unavailable, since
   * `words` is then empty for that run). Never populated for Latin runs:
   * whitespace splitting already works for Latin, so it has no degraded
   * path to fall back to.
   */
  trigrams: string[];
}

/** The Thai Unicode block, which also covers Thai combining vowels and tone marks (they are separate code points, not composed with the consonant they attach to). */
const THAI_CHAR = /[฀-๿]/;

/** Anything that is not a Unicode letter or number splits a Latin run into words. Matches hyphens, slashes, punctuation and whitespace alike, so "TU-GET" tokenises the same way whether it appears in a query or in stored content. */
const LATIN_SPLIT = /[^\p{L}\p{N}]+/u;

function hasIntlSegmenter(): boolean {
  return (
    typeof Intl !== "undefined" &&
    typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function"
  );
}

interface ScriptRun {
  text: string;
  thai: boolean;
}

/**
 * Walks the string once and groups consecutive characters into runs of the
 * same script, preserving order. A space between two Thai words becomes its
 * own (non-Thai) run, which is exactly what keeps Thai runs space-free and
 * therefore safe to trigram directly.
 */
function splitScriptRuns(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let current = "";
  let currentThai: boolean | null = null;

  for (const ch of text) {
    const thai = THAI_CHAR.test(ch);
    if (currentThai === null || thai === currentThai) {
      current += ch;
      currentThai = thai;
    } else {
      runs.push({ text: current, thai: currentThai });
      current = ch;
      currentThai = thai;
    }
  }
  if (current.length > 0 && currentThai !== null) {
    runs.push({ text: current, thai: currentThai });
  }
  return runs;
}

/**
 * Dictionary word segmentation for a run already known to be Thai. Always
 * requests the "th" locale's segmenter: the run is Thai script regardless of
 * which locale a caller passed to `tokenise`, and Thai word breaking needs
 * the Thai dictionary rather than the caller's UI locale to produce sane
 * results. Returns an empty array (never throws) when `Intl.Segmenter` is
 * unavailable, which is the signal `tokenise` uses to fall back to trigrams
 * only for that run.
 */
function segmentThaiWords(text: string): string[] {
  if (!hasIntlSegmenter()) return [];
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  const words: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (isWordLike && segment.trim().length > 0) words.push(segment);
  }
  return words;
}

/**
 * Deliberately crude suffix stripping, not a real stemmer (no Porter
 * algorithm, no exceptions table). CONTRIBUTING is explicit that English
 * should not be over-engineered: this exists only so that "form" and
 * "forms", or "route" and "routes", land on the same token.
 */
function stemLatin(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokeniseLatinRun(text: string): string[] {
  return text
    .toLowerCase()
    .split(LATIN_SPLIT)
    .filter((word) => word.length > 0)
    .map(stemLatin);
}

/**
 * Character trigrams for a single script run. Below three characters the
 * whole run is kept as one gram, so short Thai words (for example "รถ",
 * "bus") still contribute something to the trigram tier rather than
 * vanishing. Assumes the run is already free of internal whitespace, which
 * `splitScriptRuns` guarantees for Thai runs (a space is never a Thai
 * character, so it always starts a new, non-Thai run).
 */
export function trigrams(text: string): string[] {
  const chars = Array.from(text.normalize("NFC"));
  if (chars.length === 0) return [];
  if (chars.length < 3) return [chars.join("")];

  const grams: string[] = [];
  for (let i = 0; i <= chars.length - 3; i += 1) {
    grams.push(chars.slice(i, i + 3).join(""));
  }
  return grams;
}

/**
 * Tokenises mixed-script text into word tokens and trigram tokens.
 *
 * `locale` is accepted for API symmetry with the rest of the codebase (every
 * exported function that touches display text takes a `Locale`) and as an
 * explicit escape hatch, but matching is driven by the script actually
 * present in `text`, not by this flag: a `SearchRecord.haystack` always
 * contains both languages concatenated, and a query can legitimately mix
 * scripts too (a Thai sentence containing "TU-GET"), so trusting a single
 * declared locale would mis-tokenise exactly the mixed input this function
 * exists to handle. The default ("th") is what every Thai run is segmented
 * with regardless of this parameter. The parameter is intentionally unused
 * by the implementation below (hence the leading underscore, this project's
 * own convention for "accepted, not used" per eslint.config.mjs); it is kept
 * in the signature so call sites read the same way as every other exported
 * function here that takes a `Locale`, and so a future caller that genuinely
 * needs single-language behaviour has somewhere to add it without changing
 * every call site.
 */
export function tokenise(text: string, _locale: Locale = DEFAULT_LOCALE): TokeniseResult {
  const normalised = text.normalize("NFC").trim();
  if (normalised.length === 0) return { words: [], trigrams: [] };

  const words: string[] = [];
  const grams: string[] = [];

  for (const run of splitScriptRuns(normalised)) {
    if (run.thai) {
      words.push(...segmentThaiWords(run.text));
      grams.push(...trigrams(run.text));
    } else {
      words.push(...tokeniseLatinRun(run.text));
    }
  }

  return { words, trigrams: grams };
}
