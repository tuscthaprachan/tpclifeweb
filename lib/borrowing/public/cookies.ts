import "server-only";

/**
 * The two essential cookies of the public borrowing journey. Both are httpOnly,
 * SameSite=Lax, Secure in production and short lived, and neither holds
 * personal data:
 *
 *   br_journey  a random token that finds the draft answers on the server
 *   br_track    the reference and private token of the request being viewed
 *               (set by /track/link or the track form, so the token never
 *               stays in a URL, a referrer or the page history)
 *
 * Who is calling and which origin to put in a private link are the same
 * questions as for complaints, so those two are shared.
 */

import { cookies } from "next/headers";
import { requestContext, siteOrigin } from "@/lib/complaints/public/cookies";
import { JOURNEY_TTL_MS } from "./store";

const JOURNEY_COOKIE = "br_journey";
const TRACK_COOKIE = "br_track";
const TRACK_TTL_SECONDS = 60 * 60;

export { requestContext, siteOrigin };

function options(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

export async function readJourneyToken(): Promise<string | undefined> {
  return (await cookies()).get(JOURNEY_COOKIE)?.value;
}

export async function writeJourneyToken(token: string): Promise<void> {
  (await cookies()).set(JOURNEY_COOKIE, token, options(Math.floor(JOURNEY_TTL_MS / 1000)));
}

export async function clearJourneyToken(): Promise<void> {
  (await cookies()).delete(JOURNEY_COOKIE);
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
