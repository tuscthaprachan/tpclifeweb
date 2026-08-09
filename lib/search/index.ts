/**
 * The search engine: a linear scan over a prepared, in-memory copy of the
 * `SearchIndex`. A few hundred records is small enough that this is both
 * correct and far simpler than pulling in a search library, and it runs
 * entirely client-side once the index is fetched, so matching never costs a
 * network request per keystroke.
 *
 * Ranking is deliberately laid out as plain, readable arithmetic rather than
 * hidden behind an opaque similarity function:
 *
 *   score = record.weight + FIELD_SCORE[bestField] * KIND_SCORE[bestKind] * coverage
 *
 * - `record.weight` is the base from `SearchRecord.weight` (forms and
 *   shuttle routes outrank news, per lib/sanity/queries.ts).
 * - `FIELD_SCORE` makes a title match worth more than a summary match, which
 *   is worth more than a body-only match (title > summary > body).
 * - `KIND_SCORE` makes a whole-token match worth more than a prefix match,
 *   which is worth more than a trigram match (whole > prefix > trigram).
 * - `coverage` is the fraction of the query's tokens that matched, so a
 *   record matching every word of the query outranks one matching only
 *   some of them, given the same field and kind.
 *
 * The reported `matchField` / `matchKind` on each result is whichever field
 * produced the single strongest contribution, so callers (and tests) can
 * see exactly why a result ranked where it did.
 */

import type { SearchRecord } from "@/lib/sanity/types";
import { tokenise, type TokeniseResult } from "./tokenise";

export type MatchField = "title" | "summary" | "body";
export type MatchKind = "whole" | "prefix" | "trigram";

export interface SearchResult {
  record: SearchRecord;
  score: number;
  matchField: MatchField;
  matchKind: MatchKind;
}

export interface SearchOptions {
  /** Caps the number of results returned, after ranking. Unset means "all matches". */
  limit?: number;
}

/** Higher first: a title hit outranks a summary hit outranks a body-only hit. */
const FIELD_SCORE: Record<MatchField, number> = {
  title: 30,
  summary: 20,
  body: 10,
};

/** Higher first: an exact token beats a prefix beats a trigram. */
const KIND_SCORE: Record<MatchKind, number> = {
  whole: 3,
  prefix: 2,
  trigram: 1,
};

interface FieldTokens {
  words: Set<string>;
  trigrams: Set<string>;
}

interface PreparedRecord {
  title: FieldTokens;
  summary: FieldTokens;
  body: FieldTokens;
}

function toFieldTokens(result: TokeniseResult): FieldTokens {
  return { words: new Set(result.words), trigrams: new Set(result.trigrams) };
}

/**
 * Records are tokenised once and cached by object identity. A `SearchIndex`
 * fetched from `/api/search-index/[locale]` is a stable array for the
 * lifetime of a page, and the client-side combobox calls `search` again on
 * every keystroke, so this is what keeps that from re-running
 * `Intl.Segmenter` over every record's full haystack on every keystroke.
 */
const preparedCache = new WeakMap<SearchRecord, PreparedRecord>();

function prepareRecord(record: SearchRecord): PreparedRecord {
  const cached = preparedCache.get(record);
  if (cached) return cached;

  const prepared: PreparedRecord = {
    title: toFieldTokens(tokenise(`${record.title.th} ${record.title.en}`)),
    summary: toFieldTokens(tokenise(`${record.summary.th} ${record.summary.en}`)),
    // The haystack already contains the title and summary text too (see
    // getSearchIndex), which is correct: a query that only hits the body
    // should still find the record even if it also happens to repeat a
    // title word, and the field-priority scoring above already makes sure a
    // genuine title/summary hit outranks a body-only one regardless.
    body: toFieldTokens(tokenise(record.haystack)),
  };
  preparedCache.set(record, prepared);
  return prepared;
}

interface FieldMatch {
  kind: MatchKind;
  coverage: number;
}

/**
 * Scores one field against the query's tokens. Word tokens are tried first
 * (whole match, then prefix); trigrams are consulted whenever the query
 * produced no word-level hit in this field, which covers both a genuine
 * miss and the case where `Intl.Segmenter` was unavailable and the query
 * has no word tokens at all for a Thai run.
 */
function matchField(query: TokeniseResult, field: FieldTokens): FieldMatch | null {
  if (query.words.length > 0) {
    let wholeHits = 0;
    let prefixHits = 0;

    for (const queryWord of query.words) {
      if (field.words.has(queryWord)) {
        wholeHits += 1;
        continue;
      }
      for (const fieldWord of field.words) {
        if (fieldWord.startsWith(queryWord)) {
          prefixHits += 1;
          break;
        }
      }
    }

    const totalHits = wholeHits + prefixHits;
    if (totalHits > 0) {
      return {
        kind: wholeHits > 0 ? "whole" : "prefix",
        coverage: totalHits / query.words.length,
      };
    }
  }

  if (query.trigrams.length > 0) {
    let overlap = 0;
    for (const gram of query.trigrams) {
      if (field.trigrams.has(gram)) overlap += 1;
    }
    if (overlap > 0) {
      return { kind: "trigram", coverage: overlap / query.trigrams.length };
    }
  }

  return null;
}

const FIELD_ORDER: MatchField[] = ["title", "summary", "body"];

function scoreRecord(record: SearchRecord, query: TokeniseResult): SearchResult | null {
  const prepared = prepareRecord(record);

  let best: { field: MatchField; kind: MatchKind; contribution: number } | null = null;
  let total = 0;

  for (const field of FIELD_ORDER) {
    const match = matchField(query, prepared[field]);
    if (!match) continue;

    const contribution = FIELD_SCORE[field] * KIND_SCORE[match.kind] * match.coverage;
    total += contribution;

    if (!best || contribution > best.contribution) {
      best = { field, kind: match.kind, contribution };
    }
  }

  if (!best) return null;

  return {
    record,
    score: record.weight + total,
    matchField: best.field,
    matchKind: best.kind,
  };
}

/**
 * Ranks `records` against `query`. An empty (or whitespace-only) query
 * returns no results: there is nothing to rank a "match everything" query
 * against, and the caller (the search page, the combobox) is responsible
 * for deciding what an empty query state looks like.
 */
export function search(query: string, records: SearchRecord[], options: SearchOptions = {}): SearchResult[] {
  const tokenised = tokenise(query);
  if (tokenised.words.length === 0 && tokenised.trigrams.length === 0) return [];

  const results: SearchResult[] = [];
  for (const record of records) {
    const result = scoreRecord(record, tokenised);
    if (result) results.push(result);
  }

  results.sort((a, b) => b.score - a.score);

  return options.limit !== undefined ? results.slice(0, options.limit) : results;
}
