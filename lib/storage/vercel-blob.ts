import { del, get, issueSignedToken, presignUrl, put } from "@vercel/blob";

import {
  StorageError,
  assertValidKey,
  clampExpiry,
  type PutOptions,
  type PutResult,
  type Storage,
  type StoredObject,
} from "./types";

/**
 * Vercel Blob implementation (@vercel/blob 2.x).
 *
 * Blob supports genuinely private objects (`access: "private"`): the object
 * URL does not serve anonymous requests. Time-limited reads are done with a
 * delegated signed token (`issueSignedToken`) and `presignUrl`, scoped to one
 * pathname and one operation (`get`), so a leaked URL exposes one file for a
 * few minutes. Route handlers that need to authorise per request can use `get`
 * instead, which streams with the server token.
 *
 * Keys are used as Blob pathnames with no random suffix; callers supply
 * unguessable keys (`newObjectKey`) and overwrites are off.
 */
export class VercelBlobStorage implements Storage {
  constructor(private readonly token: string) {}

  async put(key: string, body: Uint8Array, options: PutOptions): Promise<PutResult> {
    assertValidKey(key);
    if (body.length > options.maxBytes) {
      throw new StorageError("too_large", "Object is larger than the allowed size.");
    }
    try {
      const result = await put(key, Buffer.from(body), {
        access: options.visibility,
        contentType: options.contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        token: this.token,
      });
      return {
        key,
        visibility: options.visibility,
        contentType: options.contentType,
        size: body.length,
        url: options.visibility === "public" ? result.url : undefined,
      };
    } catch (error) {
      throw new StorageError("backend", error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidKey(key);
    // The caller does not know the visibility, and Blob needs it. Try private first.
    for (const access of ["private", "public"] as const) {
      const result = await get(key, { access, token: this.token }).catch(() => null);
      if (result && result.statusCode === 200) {
        return { body: result.stream, contentType: result.blob.contentType, size: result.blob.size };
      }
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    await del(key, { token: this.token });
  }

  publicUrl(key: string): string {
    assertValidKey(key);
    // Token format: vercel_blob_rw_<storeId>_<secret>. Public URLs are
    // https://<storeid>.public.blob.vercel-storage.com/<pathname>.
    const storeId = this.token.split("_")[3];
    if (!storeId) throw new StorageError("not_configured", "Cannot work out the Blob store from the token.");
    return `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com/${key}`;
  }

  async signedReadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string> {
    assertValidKey(key);
    const validUntil = Date.now() + clampExpiry(options?.expiresInSeconds) * 1000;
    try {
      const signed = await issueSignedToken({
        pathname: key,
        operations: ["get"],
        validUntil,
        token: this.token,
      });
      const { presignedUrl } = await presignUrl(signed, {
        operation: "get",
        pathname: key,
        validUntil,
        access: "private",
      });
      return presignedUrl;
    } catch (error) {
      throw new StorageError("backend", error instanceof Error ? error.message : "Could not sign URL.");
    }
  }
}
