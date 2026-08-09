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
import { isLocale, negotiateLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const [, firstSegment] = pathname.split("/");
  if (isLocale(firstSegment)) {
    // Already locale-prefixed. Nothing to negotiate.
    return NextResponse.next();
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale(request.headers.get("accept-language"));

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  /*
   * Excludes /api, /_next, /studio (the Sanity Studio mounts its own routing
   * there and must not be redirected into a locale) and any path with a file
   * extension (favicon.ico, sitemap.xml, robots.txt, static assets).
   */
  matcher: ["/((?!api|_next|studio|.*\\..*).*)"],
};
