/**
 * Locale negotiation only. On a bare path with no locale prefix, works out
 * which language to send the reader to and redirects to the prefixed path:
 * the reader's remembered choice (`LOCALE_COOKIE`) first, then their
 * browser's `Accept-Language`, falling back to `DEFAULT_LOCALE`.
 *
 * Deliberately does nothing else: no auth, no A/B assignment, no other
 * personalisation. Adding those here would make every request pay for logic
 * most of them do not need.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  negotiateLocale,
  LEGACY_LOCALE_COOKIE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/lib/i18n/config";
import { isStoredTheme, LEGACY_THEME_COOKIE, THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme/config";

/**
 * Copies a cookie still held under its pre-rebrand name to the new name (same
 * attributes the writers use) and deletes the old one. A valid new cookie is
 * never overwritten.
 */
function migrateLegacyCookies(request: NextRequest, response: NextResponse) {
  const pairs = [
    { legacy: LEGACY_LOCALE_COOKIE, current: LOCALE_COOKIE, maxAge: LOCALE_COOKIE_MAX_AGE, valid: isLocale },
    { legacy: LEGACY_THEME_COOKIE, current: THEME_COOKIE, maxAge: THEME_COOKIE_MAX_AGE, valid: isStoredTheme },
  ];
  for (const { legacy, current, maxAge, valid } of pairs) {
    const legacyValue = request.cookies.get(legacy)?.value;
    if (legacyValue === undefined) continue;
    if (!request.cookies.has(current) && valid(legacyValue)) {
      response.cookies.set(current, legacyValue, { path: "/", maxAge, sameSite: "lax" });
    }
    response.cookies.delete(legacy);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const [, firstSegment] = pathname.split("/");
  if (isLocale(firstSegment)) {
    // Already locale-prefixed. Nothing to negotiate.
    return migrateLegacyCookies(request, NextResponse.next());
  }

  const cookieLocale = (request.cookies.get(LOCALE_COOKIE) ?? request.cookies.get(LEGACY_LOCALE_COOKIE))?.value;
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale(request.headers.get("accept-language"));

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return migrateLegacyCookies(request, NextResponse.redirect(redirectUrl));
}

export const config = {
  /*
   * Excludes /api, /_next, /studio (the Sanity Studio mounts its own routing
   * there and must not be redirected into a locale), /admin (the staff
   * console is a single, un-prefixed route tree that picks its language from
   * the same cookie, see lib/admin/locale.ts; authorisation lives in
   * `requireStaff`, never here) and any path with a file extension
   * (favicon.ico, sitemap.xml, robots.txt, static assets).
   */
  matcher: ["/((?!api|_next|studio|admin\\b|.*\\..*).*)"],
};
