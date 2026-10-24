/**
 * The private link people are given. It carries the reference and token in
 * the query for exactly one request: this handler checks them, swaps them for
 * an httpOnly cookie and redirects to /track/status, a page with a clean URL.
 * The redirect response has no body and no subresources, and sends
 * `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, so the token
 * is not passed on to any other site or kept by a cache. Any failure sends the
 * person to the track form with the same generic message.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isLocale, localePath } from "@/lib/i18n/config";
import { encodeTrackCookie, requestContext, TRACK_COOKIE_NAME, trackCookieOptions } from "@/lib/lost-found/public/cookies";
import { lookupTracked, parseTrackingInput } from "@/lib/lost-found/public/track";

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new NextResponse(null, { status: 404 });

  const headers = { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303, headers });
  const parsed = parseTrackingInput(request.nextUrl.searchParams.get("ref") ?? "", request.nextUrl.searchParams.get("t") ?? "");
  const track = localePath(locale, "/lost-and-found/track");
  if (!parsed || !isDatabaseConfigured()) return to(`${track}?problem=1`);

  const meta = await requestContext();
  const found = await lookupTracked(getDb(), parsed.reference, parsed.token, meta.ip);
  if (found.state === "limited") return to(`${track}?problem=limited`);
  if (found.state === "none") return to(`${track}?problem=1`);

  const response = to(`${track}/status`);
  response.cookies.set(TRACK_COOKIE_NAME, encodeTrackCookie({ reference: parsed.reference, token: parsed.token }), trackCookieOptions());
  return response;
}
