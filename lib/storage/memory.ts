import {
  StorageError,
  assertValidKey,
  clampExpiry,
  type PutOptions,
  type PutResult,
  type Storage,
  type StoredObject,
} from "./types";

interface Entry {
  bytes: Uint8Array;
  contentType: string;
  visibility: "public" | "private";
}

/**
 * In-memory storage for tests and local development without a token.
 * Signed URLs are `memory://` URLs carrying an expiry, which `isSignedUrlValid`
 * can check, so tests can exercise expiry without a network.
 */
export class MemoryStorage implements Storage {
  private readonly objects = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  async put(key: string, body: Uint8Array, options: PutOptions): Promise<PutResult> {
    assertValidKey(key);
    if (body.length > options.maxBytes) {
      throw new StorageError("too_large", "Object is larger than the allowed size.");
    }
    this.objects.set(key, {
      bytes: body.slice(),
      contentType: options.contentType,
      visibility: options.visibility,
    });
    return {
      key,
      visibility: options.visibility,
      contentType: options.contentType,
      size: body.length,
      url: options.visibility === "public" ? this.publicUrl(key) : undefined,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const entry = this.objects.get(key);
    if (!entry) return null;
    const bytes = entry.bytes.slice();
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      contentType: entry.contentType,
      size: bytes.length,
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  publicUrl(key: string): string {
    assertValidKey(key);
    const entry = this.objects.get(key);
    if (entry && entry.visibility !== "public") {
      throw new StorageError("wrong_visibility", "Object is private.");
    }
    return `memory://public/${key}`;
  }

  async signedReadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string> {
    assertValidKey(key);
    const entry = this.objects.get(key);
    if (!entry) throw new StorageError("not_found", "Object does not exist.");
    if (entry.visibility !== "private") {
      throw new StorageError("wrong_visibility", "Object is public, use publicUrl.");
    }
    const expires = this.now() + clampExpiry(options?.expiresInSeconds) * 1000;
    return `memory://private/${key}?expires=${expires}`;
  }

  /** Test helper: has this signed URL expired yet? */
  isSignedUrlValid(url: string): boolean {
    const expires = Number(new URL(url).searchParams.get("expires"));
    return Number.isFinite(expires) && this.now() < expires;
  }

  /** Test helper. */
  has(key: string): boolean {
    return this.objects.has(key);
  }
}
