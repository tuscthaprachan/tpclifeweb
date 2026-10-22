/**
 * Object storage contract.
 *
 * Deliberately S3-shaped (keys, put, get, delete, presigned GET) so the Vercel
 * Blob implementation can be swapped for S3, R2 or MinIO without touching a
 * caller. Callers hold a `key`, never a vendor URL, and the key is what goes in
 * the database.
 *
 * Visibility is a property of the object, set once at `put`:
 *   - `public`: content images. Anyone with the URL can read it.
 *   - `private`: item photos, complaint evidence. Never linked directly. Read
 *     through `signedReadUrl` (short-lived) or streamed by an authorised route
 *     handler using `get`.
 */

export type Visibility = "public" | "private";

export interface PutOptions {
  visibility: Visibility;
  /** Sniffed type from `validateUpload`, never the client's claim. */
  contentType: string;
  /** Hard ceiling in bytes. `put` rejects anything larger. */
  maxBytes: number;
}

export interface PutResult {
  key: string;
  visibility: Visibility;
  contentType: string;
  size: number;
  /** Set for public objects only. Private objects have no stable URL. */
  url?: string;
}

export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
}

export interface Storage {
  put(key: string, body: Uint8Array, options: PutOptions): Promise<PutResult>;
  /** Streams an object, for route handlers that authorise then serve. Null if absent. */
  get(key: string): Promise<StoredObject | null>;
  /** Deleting a missing key is not an error. */
  delete(key: string): Promise<void>;
  /** Stable URL for a public object. Throws for a private one. */
  publicUrl(key: string): string;
  /** Time-limited URL for a private object. */
  signedReadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string>;
}

/** Default and maximum lifetime of a signed read URL. */
export const DEFAULT_SIGNED_URL_SECONDS = 5 * 60;
export const MAX_SIGNED_URL_SECONDS = 60 * 60;

export class StorageError extends Error {
  constructor(
    readonly code: "invalid_key" | "too_large" | "not_found" | "wrong_visibility" | "not_configured" | "backend",
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;

/** Keys are lowercase path segments. No leading slash, no `..`, no empty segments. */
export function assertValidKey(key: string): void {
  if (key.length > 512 || !KEY_PATTERN.test(key) || key.split("/").some((s) => s.includes(".."))) {
    throw new StorageError("invalid_key", "Storage key is not valid.");
  }
}

export function clampExpiry(seconds: number | undefined): number {
  const wanted = seconds ?? DEFAULT_SIGNED_URL_SECONDS;
  if (!Number.isFinite(wanted) || wanted < 1) return DEFAULT_SIGNED_URL_SECONDS;
  return Math.min(Math.floor(wanted), MAX_SIGNED_URL_SECONDS);
}

/** Random, unguessable key: `<prefix>/<uuid>.<ext>`. The prefix groups by service, e.g. `lf/items`. */
export function newObjectKey(prefix: string, extension: string): string {
  const key = `${prefix}/${crypto.randomUUID()}.${extension}`;
  assertValidKey(key);
  return key;
}
