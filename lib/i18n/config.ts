/**
 * Locale contract for TryTPC.
 *
 * The site is natively bilingual, not a translated English site. Thai is the
 * default because the majority of Thammasat Tha Prachan students read Thai first, but
 * neither language is a second-class citizen: every route exists under both
 * prefixes, every piece of content carries both, and the language toggle keeps
 * you on the page you were reading.
 *
 * This file is a shared contract. Treat it as fixed.
 */

export const LOCALES = ["th", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";

/** BCP 47 tags for the `lang` attribute and `hreflang` (3.1.1, 3.1.2). */
export const HTML_LANG: Record<Locale, string> = {
  th: "th-TH",
  en: "en-GB",
};

/**
 * How each language names itself. Always shown in its own language, never
 * translated, so a reader who cannot read the current language can still find
 * their own.
 */
export const LOCALE_LABEL: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

/** The other locale. The language toggle is binary, so this is unambiguous. */
export const OTHER_LOCALE: Record<Locale, Locale> = {
  th: "en",
  en: "th",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * A field that exists in both languages. Every user-facing string in the CMS
 * uses one of these. Both sides are required: a document with an empty side is
 * blocked from publishing by Sanity validation and caught again at build time
 * by scripts/check-i18n.mjs.
 */
export interface LocaleString {
  th: string;
  en: string;
}

export interface LocaleText {
  th: string;
  en: string;
}

/**
 * Reads the active language out of a bilingual field.
 *
 * There is no fallback to the other language on purpose. Silently showing Thai
 * to someone who chose English hides the gap instead of surfacing it, and the
 * validation above means it should not happen. If it somehow does, an empty
 * string is the honest result and the missing-content check will flag it.
 */
export function pick(field: LocaleString | LocaleText | undefined | null, locale: Locale): string {
  return field?.[locale] ?? "";
}

/** Prefixes a path with the locale. Pass paths with a leading slash. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/**
 * Strips the locale prefix off a pathname, returning the locale-free route.
 * Used by the language toggle so switching language keeps your position.
 */
export function stripLocale(pathname: string): { locale: Locale | null; path: string } {
  const match = pathname.match(/^\/(th|en)(\/.*)?$/);
  if (!match) return { locale: null, path: pathname };
  return { locale: match[1] as Locale, path: match[2] || "/" };
}

/**
 * Negotiates a locale from an Accept-Language header. Used once, on a first
 * visit to a bare path, before the user's own choice is remembered.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [rawTag = "", ...params] = part.trim().split(";");
      const quality = params.find((p) => p.trim().startsWith("q="));
      const q = quality ? Number.parseFloat(quality.split("=")[1] ?? "") : 1;
      return { tag: rawTag.trim().toLowerCase(), q };
    })
    .filter((entry) => entry.tag.length > 0 && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // "th-TH" and "th" both negotiate to Thai. "*" matches nothing here and
    // falls through to the default, which is what we want.
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Cookie the language toggle writes so the choice survives the next visit. */
export const LOCALE_COOKIE = "trytpc_locale";
/** The cookie name before the rebrand. Still read as a fallback, and deleted whenever the new one is written. */
export const LEGACY_LOCALE_COOKIE = "tpclife_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Asia/Bangkok. The shuttle timetable and every published date are local time. */
export const TIME_ZONE = "Asia/Bangkok";
