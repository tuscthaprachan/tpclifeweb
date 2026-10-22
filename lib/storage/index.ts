import { MemoryStorage } from "./memory";
import { StorageError, type Storage } from "./types";
import { VercelBlobStorage } from "./vercel-blob";

export * from "./types";
export * from "./validate";
export { MemoryStorage } from "./memory";

let cached: Storage | undefined;

/**
 * Picks the implementation from the environment, on first use.
 *
 * With `BLOB_READ_WRITE_TOKEN` set it is Vercel Blob. Without it, `getStorage`
 * throws a `not_configured` error when called, not at import, so the site
 * still builds and every page that does not touch files still works.
 */
export function getStorage(): Storage {
  if (cached) return cached;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new StorageError("not_configured", "File storage is not configured. Set BLOB_READ_WRITE_TOKEN.");
  }
  cached = new VercelBlobStorage(token);
  return cached;
}

/** Tests only: replace or clear the cached implementation. */
export function setStorageForTests(storage: Storage | undefined): void {
  cached = storage;
}

/** For local development and tests that want a working store with no token. */
export function createMemoryStorage(): MemoryStorage {
  return new MemoryStorage();
}
