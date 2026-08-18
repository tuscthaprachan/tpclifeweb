/**
 * Sets the theme cookie and redirects back to the page the reader was on.
 *
 * This is the no-JavaScript baseline for the theme toggle
 * (components/layout/ThemeToggle.tsx): each of the three choices is a plain
 * `<form action="/api/theme" method="get">` around one submit button, so
 * clicking "Light" / "Dark" / "System" works as an ordinary link-like
 * navigation with no script required. `components/layout/ThemeToggle.tsx`'s
 * `onClick` intercepts that same click when JavaScript is available and
 * applies the choice instantly on the client instead, skipping the round
 * trip; this route only runs when that enhancement did not run.
 *
 * GET rather than POST because the action is idempotent (setting a
 * preference to a known value, not creating or mutating a resource) and
 * because a plain `<button type="submit">` inside a `method="get"` form is
 * the only way to make this work as a real link with no JavaScript at all.
 */

import { NextResponse } from "next/server";
import { isStoredTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme/config";

/**
 * `redirectTo` is reader-supplied (it is the current page's own path, sent
 * back to us by our own form), so it has to be revalidated server-side
 * rather than trusted, or a crafted link could redirect a visitor off-site
 * after "helpfully" setting their theme. Only a same-origin, root-relative
 * path is accepted; anything else falls back to the home page.
 */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

/**
 * Prefers the `Referer` over the form's own `redirectTo` field, because the
 * two disagree in a case that matters: `redirectTo` is built from
 * `usePathname()`, which does NOT include the query string, so switching
 * theme on `/th/lost-and-found?kind=lost&status=` would drop the reader's
 * filters and dump them back on the unfiltered list. `Referer` carries the
 * full URL, query string included, and a form GET sends it.
 *
 * The origin is checked rather than trusted: a cross-origin `Referer` (or a
 * spoofed one) must not turn this route into an open redirect, so anything
 * that does not match this request's own origin is discarded and the
 * validated `redirectTo` is used instead. `Referer` is also absent entirely
 * under some privacy settings, which is exactly why `redirectTo` stays as
 * the fallback rather than being removed.
 */
function preferredRedirect(request: Request, origin: string, fallback: string): string {
  const referer = request.headers.get("referer");
  if (!referer) return fallback;
  try {
    const parsed = new URL(referer);
    if (parsed.origin !== origin) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("value");
  const redirectTo = preferredRedirect(request, url.origin, safeRedirectPath(url.searchParams.get("redirectTo")));

  const response = NextResponse.redirect(new URL(redirectTo, url.origin), { status: 303 });

  if (isStoredTheme(value)) {
    response.cookies.set(THEME_COOKIE, value, {
      path: "/",
      maxAge: THEME_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  } else {
    // Anything else, including the explicit "system" choice, means "stop
    // forcing a theme": clearing the cookie is what lets prefers-color-scheme
    // take over again in tokens.css.
    response.cookies.delete(THEME_COOKIE);
  }

  return response;
}
