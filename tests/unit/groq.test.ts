import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parse } from "groq-js";
import { describe, expect, it } from "vitest";

/**
 * Every GROQ query in the codebase must actually parse.
 *
 * WHY THIS TEST EXISTS
 * A malformed query is the quietest failure in this codebase. `safeFetch`
 * catches the parse error and returns the caller's fallback, exactly as it
 * is designed to, so the page renders its empty state and nothing looks
 * broken: search finds nothing, a list says "nothing here yet", and the
 * only trace is a line in a server log nobody is reading. `tsc` cannot help,
 * because a query is a template literal and any string is a valid string.
 *
 * That happened. A `/* *\/` block comment was added inside
 * SEARCH_INDEX_QUERY, which GROQ has no syntax for, and the entire search
 * index (every document type, not just the one the comment sat next to)
 * silently returned zero records. GROQ comments are `//` only.
 *
 * Parsing here rather than asserting "no block comments" catches that case
 * and every other syntax error with it: an unbalanced brace, a stray comma,
 * a mistyped projection.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Stand-in values for the parameters the queries take. Only the two slice
 * bounds have to be numbers; everything else is unused during a parse and is
 * listed here so the set reads as the real parameter surface.
 */
const PARSE_PARAMS = {
  start: 0,
  end: 10,
  slug: "example",
  reference: "LF-2026-0001",
  now: "2026-08-16T00:00:00.000Z",
  type: "guidePage",
  kind: null,
  category: null,
  status: null,
};

/** Files that define GROQ queries. Add to this list when a new one appears. */
const QUERY_FILES = [
  join(root, "lib", "sanity", "queries.ts"),
  join(root, "components", "domain", "news", "queries.ts"),
];

/**
 * Pulls every `defineQuery(`...`)` body out of a source file.
 *
 * The queries interpolate shared fragments (`${DOC_META}`, and the various
 * `*_PROJECTION` constants) which are plain strings, so this substitutes
 * each one's literal value before parsing rather than trying to evaluate
 * the module. An unresolved fragment would leave `${...}` in the query and
 * fail to parse, which is itself the right outcome: a fragment this cannot
 * resolve is one a reader cannot resolve either.
 */
function extractQueries(source: string): { fragments: Record<string, string>; queries: string[] } {
  const fragments: Record<string, string> = {};
  for (const match of source.matchAll(/const (\w+) = \/\* groq \*\/ `([\s\S]*?)`;/g)) {
    const [, name, body] = match;
    if (name && body !== undefined) fragments[name] = body;
  }

  const queries: string[] = [];
  for (const match of source.matchAll(/defineQuery\(`([\s\S]*?)`\)/g)) {
    const body = match[1];
    if (body !== undefined) queries.push(body);
  }

  return { fragments, queries };
}

/**
 * Substitutes repeatedly, because fragments nest: the `*_PROJECTION`
 * constants themselves interpolate `${DOC_META}`, so one pass leaves a
 * `${...}` behind. Bounded rather than looping until stable, so a fragment
 * that somehow referred to itself fails the test instead of hanging it.
 */
function resolveFragments(query: string, fragments: Record<string, string>): string {
  let resolved = query;
  for (let pass = 0; pass < 5 && resolved.includes("${"); pass += 1) {
    resolved = resolved.replace(/\$\{(\w+)\}/g, (whole, name: string) => fragments[name] ?? whole);
  }
  return resolved;
}

describe("GROQ queries", () => {
  for (const file of QUERY_FILES) {
    const source = readFileSync(file, "utf8");
    const { fragments, queries } = extractQueries(source);
    const relative = file.slice(root.length + 1).replace(/\\/g, "/");

    it(`${relative} defines at least one query`, () => {
      // Guards the extraction itself. If the regexes above stop matching
      // because the file's style changed, this test would otherwise pass by
      // checking nothing at all.
      expect(queries.length).toBeGreaterThan(0);
    });

    queries.forEach((query, index) => {
      it(`${relative} query ${index + 1} parses`, () => {
        const resolved = resolveFragments(query, fragments);
        expect(resolved).not.toMatch(/\$\{/);
        // `params` is needed because a slice written with parameters, as the
        // paged queries do with `[$start...$end]`, is rejected outright by
        // the parser with "slicing must use constant numbers" unless it can
        // see that those two resolve to numbers. The values are arbitrary:
        // nothing here executes the query, it only has to parse.
        expect(() => parse(resolved, { params: PARSE_PARAMS })).not.toThrow();
      });
    });
  }
});
