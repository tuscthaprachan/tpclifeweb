/**
 * Guard: no "coloured box with a coloured accent".
 *
 * This site does not draw callouts, alert boxes or soft-tinted cards with a
 * coloured left or top stripe or a coloured border. Use the GOV.UK Design
 * System patterns instead:
 *
 *   - Inset text           components/ui/InsetText       (grey rule, no fill)
 *   - Warning text         components/ui/WarningText     (bold text and "!" icon)
 *   - Notification banner  components/ui/NotificationBanner (white body, solid
 *                          border and solid title bar)
 *   - Error summary        components/ui/ErrorSummary    (thick red border, white)
 *   - Summary card / list  a thin grey border and a title row, or
 *                          a heading above a rule, with a Tag for state
 *
 * What fails:
 *   1. A string (a className, usually) that pairs a coloured left, start or top
 *      border with a coloured border colour: a stripe.
 *   2. A string that pairs a coloured border colour (not a hover or checked
 *      state) with a tinted background (bg-*-soft, bg-*-tint): a tinted box
 *      with a coloured edge.
 *   3. bg-*-soft or bg-*-tint anywhere outside the tag components (a tag is a
 *      label, not a box), listed in ALLOWED_FILES below.
 *   4. In CSS, one rule that pairs a coloured left or top border with a
 *      tinted background.
 *
 * To allow a deliberate exception (a progress track, a chart key), put
 * `check-no-accent-boxes: allow` in a comment on the same line or the line
 * above. Comments are otherwise ignored, so documentation may name the
 * classes.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib", "styles"];
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".css"]);

/** Tags are small labels, so a tinted fill behind a word is allowed here. */
const ALLOWED_FILES = new Set([
  "components/ui/Tag.tsx",
  "components/ui/StatusTag.tsx",
  "components/domain/canteen/DietTag.tsx",
]);

const COLOURS = "(?:info|success|warning|error|danger|action|accent|governance|welfare|transport|activity|brand(?:-[a-z]+)*|status(?:-[a-z]+)*)";
const BORDER_COLOUR = new RegExp(`(?:^|[\\s"'\`])border(?:-[ltsrbxy])?-${COLOURS}(?![\\w-])`);
const DIRECTIONAL = /(?:^|[\s"'`:])(?:[a-z0-9-]+:)*border-(?:l|s|t)(?:-|[\s"'`]|$)/;
const COLOURED_BORDER = new RegExp(`(?:^|[\\s"'\`:])(?:[a-z0-9-]+:)*border(?:-[ltsrbxy])?-${COLOURS}(?![\\w-])`);
const TINT = /(?:^|[\s"'`:])(?:[a-z0-9-]+:)*bg-[a-z]+-(?:soft|tint)(?![\w-])/;
const TINT_BOX = TINT;

const MESSAGE = [
  "Coloured boxes with a coloured accent are not used on this site (public or admin).",
  "Use the GOV.UK patterns instead: InsetText, WarningText, NotificationBanner, ErrorSummary,",
  "a summary card (thin grey border and a title row), or a heading above a rule with a Tag for state.",
  "See the design reference page (app/[locale]/design) and scripts/check-no-accent-boxes.mjs.",
].join("\n");

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(name.slice(name.lastIndexOf(".")))) out.push(full);
  }
}

/** Blank out comments (keeping newlines so line numbers hold). Returns the stripped text. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\w])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

const problems = [];

function report(file, line, why, snippet) {
  problems.push(`${file}:${line}  ${why}\n    ${snippet.replace(/\s+/g, " ").trim().slice(0, 160)}`);
}

const files = [];
for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);

for (const full of files) {
  const rel = relative(ROOT, full).split(sep).join("/");
  const raw = readFileSync(full, "utf8");
  const rawLines = raw.split("\n");
  const allowed = (line) =>
    /check-no-accent-boxes: allow/.test(rawLines[line - 1] ?? "") || /check-no-accent-boxes: allow/.test(rawLines[line - 2] ?? "");
  const text = stripComments(raw);
  const tagFile = ALLOWED_FILES.has(rel);

  if (full.endsWith(".css")) {
    for (const m of text.matchAll(/[^{}]+\{[^{}]*\}/g)) {
      const block = m[0];
      const stripe = /border-(?:left|top|inline-start|block-start)[^;]*var\(--(?:colour-action|colour-accent|status-[a-z]+|fill-[a-z]+|brand-[a-z-]+)\)/.test(block);
      const tint = /background[^;]*var\(--(?:[a-z-]+-soft|surface-alt|surface-sunk)\)/.test(block);
      const line = lineOf(text, m.index);
      if (stripe && tint && !allowed(line)) report(rel, line, "coloured stripe on a tinted background (CSS)", block);
    }
    continue;
  }

  // Every quoted string and template literal is a candidate class list.
  const literal = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  for (const m of text.matchAll(literal)) {
    const s = m[0];
    if (!/bg-|border/.test(s)) continue;
    const line = lineOf(text, m.index);
    if (allowed(line)) continue;
    if (DIRECTIONAL.test(s) && COLOURED_BORDER.test(s)) {
      report(rel, line, "coloured left or top border (a stripe)", s);
    } else if (BORDER_COLOUR.test(s) && TINT_BOX.test(s)) {
      report(rel, line, "coloured border on a tinted background", s);
    }
  }

  // Tinted fills outside tags. Checked per line so one report names the line.
  if (!tagFile) {
    const lines = text.split("\n");
    lines.forEach((l, i) => {
      if (TINT.test(l) && /bg-[a-z]+-(?:soft|tint)/.test(l) && !allowed(i + 1)) {
        report(rel, i + 1, "bg-*-soft or bg-*-tint outside the tag components", l);
      }
    });
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.join("\n")}\n\n${MESSAGE}\n`);
  console.error(`${problems.length} problem${problems.length === 1 ? "" : "s"}.`);
  process.exit(1);
}

console.log("No coloured accent boxes found.");
