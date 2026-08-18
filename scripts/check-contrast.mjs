/**
 * Re-derives every colour pair in styles/tokens.css and fails the build if any
 * of them drops below its required WCAG 2.2 ratio.
 *
 * This exists so the design system cannot rot. A token changed in a hurry that
 * quietly breaks 1.4.3 or 1.4.11 stops CI instead of shipping.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "styles", "tokens.css"), "utf8");

/** Parse a `--name: #hex;` declaration set out of a given selector block. */
function parseBlock(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(open, end);
  const tokens = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value.toLowerCase();
  }
  return tokens;
}

function luminance(hex) {
  const channel = (v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const h = hex.replace("#", "");
  const [r, g, b] = [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const light = parseBlock(css, ":root {");
const dark = parseBlock(css, ':root[data-theme="dark"]');
const darkTheme = { ...light, ...dark };

/**
 * Each assertion is [foreground, background, minimum, why].
 *
 * 4.5 = 1.4.3 Contrast (Minimum), normal text.
 * 3.0 = 1.4.11 Non-text Contrast, or 1.4.3 for large text (>=24px, or >=18.66px bold).
 */
const surfaces = ["--surface", "--surface-alt", "--surface-sunk"];

function assertions() {
  const out = [];

  // Body, secondary and hint text must clear 4.5:1 on every surface.
  for (const surface of surfaces) {
    for (const ink of ["--ink-900", "--ink-600", "--ink-500"]) {
      out.push([ink, surface, 4.5, "body text"]);
    }
    out.push(["--colour-action", surface, 4.5, "link"]);
    out.push(["--colour-action-hover", surface, 4.5, "link hover"]);
    out.push(["--colour-accent", surface, 4.5, "secondary action"]);
    out.push(["--colour-accent-strong", surface, 4.5, "secondary action strong"]);

    // Status text.
    for (const status of ["--status-success", "--status-warning", "--status-error", "--status-info", "--status-neutral"]) {
      out.push([status, surface, 4.5, "status text"]);
    }

    // Control borders must clear 3:1 (1.4.11).
    out.push(["--line-strong", surface, 3, "control border"]);
  }

  // Ink on a soft fill: these are large tinted panels carrying body copy.
  for (const fill of [
    "--fill-transport-soft",
    "--fill-welfare-soft",
    "--fill-activity-soft",
    "--fill-governance-soft",
    "--status-success-soft",
    "--status-warning-soft",
    "--status-error-soft",
    "--status-info-soft",
    "--status-neutral-soft",
  ]) {
    out.push(["--ink-900", fill, 4.5, "ink on soft fill"]);
  }

  /*
   * A status colour on its own soft background. This pair is used wherever a
   * status icon or rule sits inside a tinted status panel. It is easy to miss,
   * because both halves individually pass against --surface while failing
   * against each other.
   *
   * 3:1 rather than 4.5:1: the status colour carries the icon and any rule,
   * never the label text. Labels are always --ink-900, which is separately
   * asserted at 4.5:1 against every soft fill below.
   */
  for (const status of ["success", "warning", "error", "info", "neutral"]) {
    out.push([`--status-${status}`, `--status-${status}-soft`, 3, `${status} icon on its own panel`]);
  }

  // Ink on a saturated fill: tags, badges, panel headers. These fills are
  // identical in both themes, so they always carry --ink-on-fill.
  for (const fill of ["--fill-transport", "--fill-welfare", "--fill-activity", "--fill-governance"]) {
    out.push(["--ink-on-fill", fill, 4.5, "ink on saturated fill"]);
  }

  // Button label on the action fill.
  out.push(["--colour-action-ink", "--colour-action", 4.5, "button label"]);
  out.push(["--colour-action-ink", "--colour-action-hover", 4.5, "button label hover"]);

  return out;
}

/**
 * The three pastels are fills only. If any of them is ever assigned to a text
 * or border role token, this catches it regardless of what the assertions say.
 *
 * Derived from the parsed brand primitives rather than written out as literal
 * hexes, because a literal set silently stops matching the moment the palette
 * is retuned, and a guard that quietly matches nothing is worse than no guard.
 */
const FILL_ONLY = new Set(
  ["--brand-orange", "--brand-coral", "--brand-lilac"].map((name) => {
    const value = light[name];
    if (!value) throw new Error(`fill-only primitive not found in :root: ${name}`);
    return value;
  }),
);
const TEXT_ROLES = [
  "--ink-900",
  "--ink-600",
  "--ink-500",
  "--colour-action",
  "--colour-action-hover",
  "--colour-accent",
  "--colour-accent-strong",
  "--line-strong",
];

let failures = 0;
let checks = 0;

for (const [themeName, tokens] of [
  ["light", light],
  ["dark", darkTheme],
]) {
  console.log(`\n${themeName} theme`);
  console.log("-".repeat(72));

  for (const [fgName, bgName, min, why] of assertions()) {
    const fg = tokens[fgName];
    const bg = tokens[bgName];
    if (!fg || !bg) {
      console.error(`  MISSING  ${fgName} on ${bgName}`);
      failures += 1;
      continue;
    }
    const r = ratio(fg, bg);
    checks += 1;
    const ok = r >= min;
    if (!ok) failures += 1;
    if (!ok || process.env.VERBOSE) {
      const mark = ok ? "ok  " : "FAIL";
      console.log(
        `  ${mark} ${r.toFixed(2).padStart(5)}:1 (need ${min}) ${fgName} on ${bgName}  ${why}`,
      );
    }
  }

  /*
   * Focus indicator. The two tones sit adjacent to each other, so the composite
   * reads as long as at least one of them clears 3:1 against the surface behind
   * it. In the light theme that is the dark bar (the orange is only 2.00:1 on
   * white, which is precisely why the bar exists). In the dark theme both do.
   */
  {
    const best = Math.max(
      ratio(tokens["--focus-bar"], tokens["--surface"]),
      ratio(tokens["--focus-fill"], tokens["--surface"]),
    );
    checks += 1;
    if (best < 3) {
      console.log(
        `  FAIL  ${best.toFixed(2).padStart(5)}:1 (need 3) neither focus tone is visible on --surface`,
      );
      failures += 1;
    } else if (process.env.VERBOSE) {
      console.log(`  ok   ${best.toFixed(2).padStart(5)}:1 (need 3) focus indicator on --surface`);
    }
  }

  // Light theme only: the pastels must never hold a text or border role.
  if (themeName === "light") {
    for (const role of TEXT_ROLES) {
      if (FILL_ONLY.has(tokens[role])) {
        console.error(
          `  FAIL  ${role} is set to ${tokens[role]}, which is a fill-only colour. ` +
            `See the hard rule at the top of tokens.css.`,
        );
        failures += 1;
      }
    }
  }
}

console.log("-".repeat(72));
if (failures > 0) {
  console.error(`\n${failures} contrast failure(s) across ${checks} checks.\n`);
  process.exit(1);
}
console.log(`\nAll ${checks} contrast checks pass.\n`);
