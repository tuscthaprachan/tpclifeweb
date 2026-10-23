/**
 * The short-lived, signed "where am I in signing in" cookie value. It carries
 * the email address between the pages of the sign-in journey (so it never sits
 * in a URL, browser history or server log) and, for an invited person, the
 * invite token to accept once the code is right.
 *
 * Signed with HMAC-SHA256 so it cannot be forged or edited; not encrypted, as
 * it only ever goes back to the browser that typed those values.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const FLOW_TTL_MS = 15 * 60 * 1000;

export interface SignInFlow {
  email: string;
  /** Raw invite token, present when the journey started from an invite link. */
  invite?: string;
  /** Epoch milliseconds. */
  exp: number;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** JSON, base64url, then an HMAC over that. Tamper-proof, not secret. */
export function sealJson(value: unknown, secret: string): string {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** The parsed value, or null when the signature is wrong or the text is malformed. */
export function unsealJson(sealed: string | undefined, secret: string): unknown {
  if (!sealed) return null;
  const [body, signature, ...rest] = sealed.split(".");
  if (!body || !signature || rest.length > 0) return null;
  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function encodeFlow(flow: Omit<SignInFlow, "exp">, secret: string, now: number = Date.now()): string {
  return sealJson({ ...flow, exp: now + FLOW_TTL_MS }, secret);
}

export function decodeFlow(value: string | undefined, secret: string, now: number = Date.now()): SignInFlow | null {
  const parsed = unsealJson(value, secret) as Partial<SignInFlow> | null;
  if (!parsed || typeof parsed.email !== "string" || typeof parsed.exp !== "number" || parsed.exp < now) return null;
  return { email: parsed.email, invite: typeof parsed.invite === "string" ? parsed.invite : undefined, exp: parsed.exp };
}
