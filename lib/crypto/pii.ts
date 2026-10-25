import "server-only";

/**
 * Column-level encryption for personal data (PDPA). AES-256-GCM from
 * `node:crypto`.
 *
 * FORMAT. `pii1.<keyId>.<iv>.<ciphertext>.<tag>`, each part base64url. The key
 * id is derived from the key itself (the first 6 bytes of its SHA-256), so a
 * ciphertext names the key that made it with no registry to keep in step.
 *
 * KEYS. `PII_ENCRYPTION_KEY` (32 bytes, base64) encrypts and decrypts.
 * `PII_ENCRYPTION_KEY_PREVIOUS` (one key, or several separated by commas) is
 * tried for decryption only, which is how a key is rotated: move the old key
 * there, set a new one, then run `reencryptPii` over the stored values.
 *
 * AAD. Callers bind a value to where it lives (`case_contacts:email:<row id>`).
 * A ciphertext copied into another row or column then fails to decrypt.
 *
 * NO KEY. In production a missing or malformed key throws `PiiUnavailableError`
 * and nothing is stored: plaintext is never written. Outside production a fixed
 * development key is used, with a one-time warning. It is public in this
 * repository, so it protects nothing; it only keeps development working.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "pii1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Thrown when personal data cannot be encrypted or decrypted safely. The UI shows "This service is not available right now". */
export class PiiUnavailableError extends Error {
  constructor(
    readonly reason: "missing_key" | "invalid_key" | "no_matching_key" | "corrupt",
    message: string,
  ) {
    super(message);
    this.name = "PiiUnavailableError";
  }
}

interface Key {
  id: string;
  bytes: Buffer;
}

export type PiiEnv = Record<string, string | undefined>;

function toKey(bytes: Buffer): Key {
  return { id: createHash("sha256").update(bytes).digest().subarray(0, 6).toString("base64url"), bytes };
}

function parseKey(raw: string, name: string): Key {
  const bytes = Buffer.from(raw.trim(), "base64");
  if (bytes.length !== KEY_BYTES) {
    throw new PiiUnavailableError("invalid_key", `${name} must be 32 bytes, base64 encoded (generate one with: openssl rand -base64 32).`);
  }
  return toKey(bytes);
}

let warned = false;

interface Keyring {
  current: Key;
  previous: Key[];
}

function loadKeyring(env: PiiEnv): Keyring {
  const raw = env.PII_ENCRYPTION_KEY?.trim();
  const previous = (env.PII_ENCRYPTION_KEY_PREVIOUS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseKey(s, "PII_ENCRYPTION_KEY_PREVIOUS"));
  if (raw) return { current: parseKey(raw, "PII_ENCRYPTION_KEY"), previous };
  if (env.NODE_ENV === "production") {
    throw new PiiUnavailableError("missing_key", "PII_ENCRYPTION_KEY is not set, so personal data cannot be stored or read.");
  }
  if (!warned && env.NODE_ENV !== "test") {
    warned = true;
    console.warn("[pii] PII_ENCRYPTION_KEY is not set: using the fixed development key. Never do this in production.");
  }
  return { current: toKey(createHash("sha256").update("trytpc development pii key, not a secret").digest()), previous };
}

/** True when personal data can be encrypted and decrypted here. Journeys that collect it check this first and show the unavailable page. */
export function isPiiAvailable(env: PiiEnv = process.env): boolean {
  try {
    loadKeyring(env);
    return true;
  } catch {
    return false;
  }
}

/** True for a value in this module's format. */
export function isPiiCiphertext(value: string): boolean {
  return value.startsWith(`${PREFIX}.`) && value.split(".").length === 5;
}

/** Encrypts `plaintext`, binding it to `aad`. Throws `PiiUnavailableError` without a usable key. */
export function encryptPii(plaintext: string, aad: string, env: PiiEnv = process.env): string {
  const { current } = loadKeyring(env);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", current.bytes, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, current.id, iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

/** Decrypts a value made by `encryptPii` with the same `aad`, using the current or a previous key. */
export function decryptPii(value: string, aad: string, env: PiiEnv = process.env): string {
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== PREFIX) throw new PiiUnavailableError("corrupt", "Stored value is not encrypted personal data.");
  const [, keyId, ivText, ctText, tagText] = parts as [string, string, string, string, string];
  const ring = loadKeyring(env);
  const key = [ring.current, ...ring.previous].find((k) => k.id === keyId);
  if (!key) throw new PiiUnavailableError("no_matching_key", "No configured key matches this value. Is PII_ENCRYPTION_KEY_PREVIOUS missing?");
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new PiiUnavailableError("corrupt", "Stored value is damaged.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key.bytes, iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(ctText, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new PiiUnavailableError("corrupt", "Stored value failed its integrity check.");
  }
}

/** `encryptPii` for an optional field: empty and missing values stay null. */
export function encryptOptionalPii(value: string | null | undefined, aad: string, env: PiiEnv = process.env): string | null {
  const text = value?.trim();
  return text ? encryptPii(text, aad, env) : null;
}

/** `decryptPii` for an optional field. */
export function decryptOptionalPii(value: string | null | undefined, aad: string, env: PiiEnv = process.env): string | null {
  return value ? decryptPii(value, aad, env) : null;
}

/** True when `value` was made with a key other than the current one, so `reencryptPii` would change it. */
export function needsReencryption(value: string, env: PiiEnv = process.env): boolean {
  return value.split(".")[1] !== loadKeyring(env).current.id;
}

/** Decrypts with any known key and encrypts again with the current one (key rotation). */
export function reencryptPii(value: string, aad: string, env: PiiEnv = process.env): string {
  return encryptPii(decryptPii(value, aad, env), aad, env);
}
