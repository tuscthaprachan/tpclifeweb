/**
 * Theme contract for TryTPC.
 *
 * Deliberately a small, dedicated module rather than an addition to
 * `lib/i18n/config.ts`. That file is a fixed shared contract for locale, and
 * a colour scheme is a different axis entirely (CONTRIBUTING.md's own
 * instruction: do not widen a fixed contract file, write a new one). This
 * mirrors that file's LOCALE_COOKIE pattern on purpose, because the same
 * problem (remember a per-visitor choice, read it on the server, avoid a
 * flash of the wrong value) has the same shape both times.
 *
 * "system" is a real third state, not a synonym for "whatever the OS
 * currently says". Choosing it clears the cookie entirely rather than
 * writing the string "system", so a reader who picks it keeps following
 * `prefers-color-scheme` for the rest of time, including if their OS
 * setting changes later. Only "light" and "dark" are ever persisted.
 */

export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** The subset of ThemeChoice that is actually written to the cookie. "system" is the absence of a cookie, not a value. */
export type StoredTheme = Exclude<ThemeChoice, "system">;

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

export function isStoredTheme(value: unknown): value is StoredTheme {
  return value === "light" || value === "dark";
}

/** Cookie the theme toggle writes so the choice survives the next visit and can be read during SSR, avoiding a flash of the wrong theme. */
export const THEME_COOKIE = "trytpc_theme";
/** The cookie name before the rebrand. Still read as a fallback, and deleted whenever the new one is written. */
export const LEGACY_THEME_COOKIE = "tpclife_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )(?:${THEME_COOKIE}|${LEGACY_THEME_COOKIE})=(light|dark)(?:;|$)/);if(m){var r=document.documentElement;r.setAttribute("data-theme",m[1]);r.style.colorScheme=m[1]}}catch(e){}})()`;

export function readAppliedTheme(): ThemeChoice {
  const value = document.documentElement.getAttribute("data-theme");
  return isStoredTheme(value) ? value : "system";
}
