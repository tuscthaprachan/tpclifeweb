export function isAppHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\") && !/^\/(api|_next)(\/|$)/.test(href);
}

/** A path on this site in the reader's language; a path that already names a language, or any other link, is left alone. */
export function localiseAppHref(href: string, locale: "th" | "en"): string {
  if (!isAppHref(href) || /^\/(th|en)(\/|\?|#|$)/.test(href)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}
