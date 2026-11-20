import { LocalDiskStorage } from "./local-disk";
import { MemoryStorage } from "./memory";
import { StorageError, type Storage } from "./types";
import { VercelBlobStorage } from "./vercel-blob";

export * from "./types";
export * from "./validate";
export { MemoryStorage } from "./memory";
export { LocalDiskStorage } from "./local-disk";

let cached: Storage | undefined;

/**
 * Picks the implementation from the environment, on first use.
 *
 * With `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` (Vercel OIDC) set it is
 * Vercel Blob. Without either, `getStorage` throws a `not_configured` error when called, not at import, so the site
 * still builds and every page that does not touch files still works.
 */
export function getStorage(): Storage {
  if (cached) return cached;
  const disk = getDiskStorage();
  if (disk) {
    cached = disk;
    return cached;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN || undefined;
  // Token format: vercel_blob_rw_<storeId>_<secret>.
  const storeId = process.env.BLOB_STORE_ID || token?.split("_")[3];
  if (!storeId) {
    throw new StorageError(
      "not_configured",
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID.",
    );
  }
  cached = new VercelBlobStorage({ token, storeId });
  return cached;
}

export function storageSigningSecret(): string | undefined {
  return process.env.STORAGE_SIGNING_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || undefined;
}

export function getDiskStorage(): LocalDiskStorage | null {
  const root = process.env.STORAGE_DIR?.trim();
  if (!root) return null;
  const signingSecret = storageSigningSecret();
  if (!signingSecret) {
    throw new StorageError("not_configured", "STORAGE_DIR is set but there is no STORAGE_SIGNING_SECRET or BETTER_AUTH_SECRET to sign private links with.");
  }
  return new LocalDiskStorage({ root, signingSecret });
}

/** Tests only: replace or clear the cached implementation. */
export function setStorageForTests(storage: Storage | undefined): void {
  cached = storage;
}

/** For local development and tests that want a working store with no token. */
export function createMemoryStorage(): MemoryStorage {
  return new MemoryStorage();
}
