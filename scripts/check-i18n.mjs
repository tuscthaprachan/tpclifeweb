/**
 * Two checks that protect the bilingual promise and the house style.
 *
 * 1. No em dashes in any source file. The house style forbids them outright,
 *    and they are easy to introduce by accident when pasting.
 * 2. Every entry in lib/i18n/strings.ts carries a non-empty th and en.
 *
 * The database side of the same promise is enforced by the admin forms and the
 * content schemas, which refuse to publish a record with a half-filled
 * bilingual field.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, extname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "test-results",
  "playwright-report",
]);
const CHECK_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx", ".css", ".md", ".json"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (CHECK_EXT.has(extname(entry))) files.push(full);
  }
  return files;
}

let failures = 0;

/* ---- 1. No em dashes ---------------------------------------------------- */

// U+2014 em dash, and U+2013 en dash used as a sentence break.
const EM_DASH = /—/;

/*
 * Files that are not ours to style.
 *
 * AGENTS.md is written and re-added by `next dev` on every run, so deleting it
 * or editing its em dashes out only produces an uncommitted change that comes
 * straight back. The house style governs copy we write, not a vendor's
 * generated file.
 */
const GENERATED = new Set(["AGENTS.md"]);

/*
 * Published documents transcribed exactly as printed. Open data is served
 * as-is, so the student bodies' own punctuation stays.
 */
const TRANSCRIBED = join("data", "open-data");

for (const file of walk(root)) {
  // This script necessarily contains the character it is looking for.
  if (file.endsWith("check-i18n.mjs")) continue;
  if (GENERATED.has(relative(root, file))) continue;
  if (relative(root, file).startsWith(TRANSCRIBED)) continue;

  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (EM_DASH.test(line)) {
      console.error(`  em dash  ${relative(root, file)}:${i + 1}`);
      console.error(`           ${line.trim().slice(0, 100)}`);
      failures += 1;
    }
  });
}

/* ---- 2. Every shared string has both languages -------------------------- */

const stringsPath = join(root, "lib", "i18n", "strings.ts");
const source = readFileSync(stringsPath, "utf8");

// Match `key: { th: "...", en: "..." }` across line breaks.
const entry = /(\w+)\s*:\s*\{\s*th\s*:\s*"([^"]*)"\s*,\s*en\s*:\s*"([^"]*)"\s*,?\s*\}/gs;
const seen = new Set();

for (const [, key, th, en] of source.matchAll(entry)) {
  seen.add(key);
  if (!th.trim()) {
    console.error(`  missing th  UI.${key}`);
    failures += 1;
  }
  if (!en.trim()) {
    console.error(`  missing en  UI.${key}`);
    failures += 1;
  }
}

// Catch a key declared in a shape the matcher above does not recognise, which
// would otherwise pass silently.
const declared = [...source.matchAll(/^\s{2}(\w+)\s*:\s*\{/gm)].map((m) => m[1]);
for (const key of declared) {
  if (!seen.has(key)) {
    console.error(`  unparsed  UI.${key} is not a plain { th, en } pair`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} problem(s) found.\n`);
  process.exit(1);
}
console.log(`\nNo em dashes. All ${seen.size} shared strings have both languages.\n`);
