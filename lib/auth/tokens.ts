/**
 * Invite and recovery tokens. The raw token is shown once, in the link; only its
 * SHA-256 is stored. 32 random bytes (256 bits) means a fast hash is enough:
 * there is nothing to brute force, unlike a human-chosen password. Tokens are
 * looked up by their hash in the database, so the secret itself is never
 * compared with `===`, and a database leak cannot be turned into working links.
 */

import { createHash, randomBytes } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
