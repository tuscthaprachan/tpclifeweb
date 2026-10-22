import "server-only";

/**
 * The server-side Better Auth instance, created on first use.
 *
 * Nothing here reads an environment variable at import time, so `next build`
 * succeeds with no `DATABASE_URL` or secrets. Pages call `isAuthConfigured()`
 * and show a plain "not configured" state; the first real use of `getAuth()`
 * without configuration throws a message that names what is missing.
 */

import { getEmailSender } from "@/lib/email";
import { getDb } from "@/lib/db";
import { createAuth, type Auth } from "./create";
import { getAllowedDomains } from "./domains";

export type { Auth };

/** Better Auth refuses to start with a weak secret, so say so up front. */
const MIN_SECRET_LENGTH = 32;

export function getAuthBaseUrl(): string | undefined {
  const explicit = process.env.BETTER_AUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  // Vercel preview deployments each have their own host and no BETTER_AUTH_URL.
  const vercel = process.env.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : undefined;
}

/** What is missing, by variable name. Empty when sign-in can work. */
export function missingAuthConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) missing.push("BETTER_AUTH_SECRET");
  if (!getAuthBaseUrl()) missing.push("BETTER_AUTH_URL");
  return missing;
}

export function isAuthConfigured(): boolean {
  return missingAuthConfig().length === 0;
}

let cached: Auth | undefined;

export function getAuth(): Auth {
  if (cached) return cached;
  const missing = missingAuthConfig();
  if (missing.length > 0) {
    throw new Error(`Sign-in is not configured. Set ${missing.join(", ")}. See .env.example.`);
  }
  cached = createAuth({
    db: getDb(),
    secret: process.env.BETTER_AUTH_SECRET as string,
    baseURL: getAuthBaseUrl() as string,
    allowedDomains: getAllowedDomains(),
    getEmailSender,
  });
  return cached;
}
