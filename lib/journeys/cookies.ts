import "server-only";

/**
 * The essential cookies of a public journey. All are httpOnly, SameSite=Lax,
 * Secure in production and short lived, and none holds personal data:
 *
 *   <name>_journey  a random token that finds the draft answers on the server
 *   <name>_track    the reference and private token of the case being viewed
 *                   (set by /track/link or the track form, so the token never
 *                   stays in a URL, a referrer or the page history)
 */

import { cookies, headers } from "next/headers";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/site-url";

export function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

/** The draft token cookie `name`, kept for `ttlMs`. */
export function journeyCookie(name: string, ttlMs: number) {
  return {
    name,
    read: async (): Promise<string | undefined> => (await cookies()).get(name)?.value,
    write: async (token: string): Promise<void> => {
      (await cookies()).set(name, token, cookieOptions(Math.floor(ttlMs / 1000)));
    },
    clear: async (): Promise<void> => {
      (await cookies()).delete(name);
    },
  };
}

export interface TrackCookie {
  reference: string;
  token: string;
}

export function encodeTrackCookie(value: TrackCookie): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/** The cookie that holds the reference and private token of the case being viewed. */
export function trackCookie(name: string, ttlSeconds: number) {
  return {
    name,
    options: () => cookieOptions(ttlSeconds),
    read: async (): Promise<TrackCookie | null> => {
      const raw = (await cookies()).get(name)?.value;
      if (!raw) return null;
      try {
        const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<TrackCookie>;
        return typeof parsed.reference === "string" && typeof parsed.token === "string" ? { reference: parsed.reference, token: parsed.token } : null;
      } catch {
        return null;
      }
    },
    write: async (value: TrackCookie): Promise<void> => {
      (await cookies()).set(name, encodeTrackCookie(value), cookieOptions(ttlSeconds));
    },
    clear: async (): Promise<void> => {
      (await cookies()).delete(name);
    },
  };
}

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
  if (IS_PRODUCTION_SITE) return SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE_URL;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (/^localhost(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
