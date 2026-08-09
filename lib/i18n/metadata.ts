import type { Metadata } from "next";

import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "./config";

/**
 * Per-route `hreflang` and canonical links.
 *
 * WHY THIS IS NOT IN THE LAYOUT
 * `app/[locale]/layout.tsx` only receives `{ locale }` in its params. It has no
 * way to know which route is rendering, so any `alternates` it sets are the
 * same on every page. That is what shipped first, and the effect was that every
 * Thai page advertised the Thai HOME page as its own alternate: a search engine
 * reading /th/forms was told the English equivalent of that page was /en, not
 * /en/forms.
 *
 * Reading the path from a header in the layout would fix it in one place, but
 * `headers()` opts the whole tree out of static rendering, which would turn 40
 * prerendered routes into dynamic ones to produce two link tags. Not worth it.
 *
 * So each page declares its own route. `tests/a11y/structure.spec.ts` asserts
 * that every route has reciprocal alternates pointing at itself, so a page that
 * forgets to call this fails the build rather than quietly regressing.
 *
 * Pass the LOCALE-FREE route, with a leading slash: "/", "/forms", "/policy".
 * For a dynamic page pass the resolved path, for example `/forms/${slug}`.
 */
export function alternatesFor(locale: Locale, route: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = localePath(l, route);
  }
  // x-default is what a search engine serves when it has no better match for
  // the reader's language. Thai, because this is a Thai campus.
  languages["x-default"] = localePath(DEFAULT_LOCALE, route);

  return {
    canonical: localePath(locale, route),
    languages,
  };
}
