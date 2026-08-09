/**
 * The two typefaces the site uses, loaded once here so every entry point
 * (the normal `app/[locale]/layout.tsx` root layout and the standalone
 * `app/not-found.tsx` fallback, which renders its own `<html>` because it can
 * be reached before any locale is known) applies the exact same font
 * classes. `styles/tokens.css` references `--font-lexend` and
 * `--font-sarabun` directly, so the variable names here are load-bearing.
 *
 * Sarabun carries the `thai` subset (its point) and `latin`, so an all-Thai
 * page still renders the many Latin acronyms (TUSU, TU-GET, MRT) without a
 * face switch mid-sentence. See styles/typography.css for how `:lang()`
 * chooses between the two.
 */

import { Lexend, Sarabun } from "next/font/google";

export const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-lexend",
});

export const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sarabun",
});

/** Applied to `<html>` so both font variables are in scope everywhere. */
export const fontVariables = `${lexend.variable} ${sarabun.variable}`;
