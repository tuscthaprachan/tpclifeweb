/**
 * Redirects, then locale negotiation. A path the console redirects (an old
 * slug) is sent to its new address first. On a bare path with no locale
 * prefix, works out which language to send the reader to and redirects to the
 * prefixed path: the reader's remembered choice (`LOCALE_COOKIE`) first, then
 * their browser's `Accept-Language`, falling back to `DEFAULT_LOCALE`.
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
import { FILTERED_HEADER, FILTERED_SEGMENT, hasReaderQuery, isQueryRoute } from "@/lib/query-routes";
import { findRedirect } from "@/lib/redirects/proxy-cache";
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

/**
 * A redirect from the console's table, if one starts at this path. The table
 * is held in memory (`lib/redirects/proxy-cache.ts`), so this is a lookup and
 * not a query. Chains are flattened when the table is built, so a reader is
 * redirected once; a target that is the request's own path is ignored.
 */
async function redirectResponse(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const hit = await findRedirect(request.nextUrl.origin, pathname);
  if (!hit) return null;
  const target = new URL(hit.to, request.url);
  if (target.origin === request.nextUrl.origin && target.pathname === pathname) return null;
  if (!hit.to.includes("?") && target.origin === request.nextUrl.origin) target.search = request.nextUrl.search;
  return NextResponse.redirect(target, hit.status === 308 ? 308 : 301);
}

export async function proxy(request: NextRequest) {
  const redirected = await redirectResponse(request);
  if (redirected) return redirected;

  const { pathname } = request.nextUrl;

  const [, firstSegment] = pathname.split("/");
  if (isLocale(firstSegment)) {
    const rest = pathname.slice(firstSegment.length + 1) || "/";
    if (rest === `/${FILTERED_SEGMENT}` || rest.startsWith(`/${FILTERED_SEGMENT}/`)) {
      return NextResponse.rewrite(new URL(`/${firstSegment}/${FILTERED_SEGMENT}-not-found`, request.url));
    }
    const isDocument = request.headers.get("rsc") !== "1";
    if (isDocument && isQueryRoute(rest) && (hasReaderQuery(request.nextUrl.searchParams) || rest === "/eat/pick")) {
      const target = request.nextUrl.clone();
      target.pathname = `/${firstSegment}/${FILTERED_SEGMENT}${rest}`;
      const headers = new Headers(request.headers);
      headers.set(FILTERED_HEADER, "1");
      return migrateLegacyCookies(request, NextResponse.rewrite(target, { request: { headers } }));
    }
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
   * Excludes /api, /_next, /admin (the staff
   * console is a single, un-prefixed route tree that picks its language from
   * the same cookie, see lib/admin/locale.ts; authorisation lives in
   * `requireStaff`, never here) and any path with a file extension
   * (favicon.ico, sitemap.xml, robots.txt, static assets).
   */
  matcher: [
    {
      source: "/((?!api|_next|admin\\b|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
