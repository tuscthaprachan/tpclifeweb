import "server-only";

/**
 * The two essential cookies of the public lost and found journeys. Both are
 * httpOnly, SameSite=Lax, Secure in production and short lived, and neither
 * holds personal data:
 *
 *   lf_journey_<kind>  a random token that finds the draft answers on the server
 *   lf_track           the reference and private token of the case being viewed
 *                      (set by /track/link or the track form, so the token never
 *                      stays in a URL, a referrer or the page history)
 */

import { cookies, headers } from "next/headers";
import { SITE_URL } from "@/lib/site-url";
import type { JourneyKind } from "./steps";
import { JOURNEY_TTL_MS } from "./store";

const TRACK_COOKIE = "lf_track";
const TRACK_TTL_SECONDS = 60 * 60;

function options(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

const journeyCookie = (kind: JourneyKind) => `lf_journey_${kind}`;

export async function readJourneyToken(kind: JourneyKind): Promise<string | undefined> {
  return (await cookies()).get(journeyCookie(kind))?.value;
}

export async function writeJourneyToken(kind: JourneyKind, token: string): Promise<void> {
  (await cookies()).set(journeyCookie(kind), token, options(Math.floor(JOURNEY_TTL_MS / 1000)));
}

export async function clearJourneyToken(kind: JourneyKind): Promise<void> {
  (await cookies()).delete(journeyCookie(kind));
}

export interface TrackCookie {
  reference: string;
  token: string;
}

export async function readTrackCookie(): Promise<TrackCookie | null> {
  const raw = (await cookies()).get(TRACK_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<TrackCookie>;
    return typeof parsed.reference === "string" && typeof parsed.token === "string" ? { reference: parsed.reference, token: parsed.token } : null;
  } catch {
    return null;
  }
}

export function encodeTrackCookie(value: TrackCookie): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export async function writeTrackCookie(value: TrackCookie): Promise<void> {
  (await cookies()).set(TRACK_COOKIE, encodeTrackCookie(value), options(TRACK_TTL_SECONDS));
}

export async function clearTrackCookie(): Promise<void> {
  (await cookies()).delete(TRACK_COOKIE);
}

/** Cookie settings for a route handler that sets the track cookie on its own response. */
export const TRACK_COOKIE_NAME = TRACK_COOKIE;
export const trackCookieOptions = () => options(TRACK_TTL_SECONDS);

/** Who is calling, for rate limits and audit rows. */
export async function requestContext(): Promise<{ ip: string | null; userAgent: string | null; requestId: string }> {
  const h = await headers();
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() || null,
    userAgent: h.get("user-agent"),
    requestId: h.get("x-vercel-id") ?? h.get("x-request-id") ?? crypto.randomUUID(),
  };
}

/**
 * The origin to put in a private link. Production always uses the canonical
 * site URL; previews and local runs use the host the request came to, so the
 * link a person copies opens on the same deployment.
 */
export async function siteOrigin(): Promise<string> {
  if (process.env.VERCEL_ENV === "production") return SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE_URL;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (/^localhost(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
