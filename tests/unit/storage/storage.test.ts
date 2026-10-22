import { afterEach, describe, expect, it } from "vitest";

import { MemoryStorage, StorageError, assertValidKey, getStorage, newObjectKey, setStorageForTests } from "@/lib/storage";
import { MAX_SIGNED_URL_SECONDS } from "@/lib/storage/types";

const data = new Uint8Array([1, 2, 3]);
const priv = { visibility: "private", contentType: "image/png", maxBytes: 100 } as const;
const pub = { visibility: "public", contentType: "image/png", maxBytes: 100 } as const;

async function read(stream: ReadableStream<Uint8Array>): Promise<number[]> {
  const out: number[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(...value);
  }
}

describe("MemoryStorage", () => {
  it("round-trips an object", async () => {
    const s = new MemoryStorage();
    const result = await s.put("lf/items/a.png", data, priv);
    expect(result).toMatchObject({ key: "lf/items/a.png", size: 3, visibility: "private" });
    const got = await s.get("lf/items/a.png");
    expect(got?.contentType).toBe("image/png");
    expect(await read(got!.body)).toEqual([1, 2, 3]);
  });

  it("returns null for a missing key and tolerates deleting it", async () => {
    const s = new MemoryStorage();
    expect(await s.get("nope.png")).toBeNull();
    await expect(s.delete("nope.png")).resolves.toBeUndefined();
  });

  it("deletes", async () => {
    const s = new MemoryStorage();
    await s.put("a.png", data, pub);
    await s.delete("a.png");
    expect(s.has("a.png")).toBe(false);
  });

  it("rejects objects over maxBytes", async () => {
    const s = new MemoryStorage();
    await expect(s.put("a.png", data, { ...priv, maxBytes: 2 })).rejects.toMatchObject({ code: "too_large" });
  });

  it("gives public objects a URL and private ones none", async () => {
    const s = new MemoryStorage();
    expect((await s.put("p.png", data, pub)).url).toBe("memory://public/p.png");
    expect((await s.put("q.png", data, priv)).url).toBeUndefined();
    expect(() => s.publicUrl("q.png")).toThrow(StorageError);
  });

  it("signs private objects only, and the URL expires", async () => {
    let now = 1_000_000;
    const s = new MemoryStorage(() => now);
    await s.put("q.png", data, priv);
    await s.put("p.png", data, pub);
    await expect(s.signedReadUrl("p.png")).rejects.toMatchObject({ code: "wrong_visibility" });
    await expect(s.signedReadUrl("missing.png")).rejects.toMatchObject({ code: "not_found" });
    const url = await s.signedReadUrl("q.png", { expiresInSeconds: 60 });
    expect(s.isSignedUrlValid(url)).toBe(true);
    now += 61_000;
    expect(s.isSignedUrlValid(url)).toBe(false);
  });

  it("caps the signed URL lifetime", async () => {
    const now = 0;
    const s = new MemoryStorage(() => now);
    await s.put("q.png", data, priv);
    const url = await s.signedReadUrl("q.png", { expiresInSeconds: 10 * 24 * 3600 });
    expect(new URL(url).searchParams.get("expires")).toBe(String(MAX_SIGNED_URL_SECONDS * 1000));
  });
});

describe("keys", () => {
  it("accepts generated keys", () => {
    expect(() => assertValidKey(newObjectKey("lf/items", "jpg"))).not.toThrow();
  });

  it.each(["../x.png", "/x.png", "a//b.png", "A.png", "a/../b.png", "a b.png", ""])("rejects %j", (key) => {
    expect(() => assertValidKey(key)).toThrow(StorageError);
  });
});

describe("getStorage", () => {
  afterEach(() => {
    setStorageForTests(undefined);
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("throws only when used, and only without a token", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(() => getStorage()).toThrow(/not configured/);
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_abc123_secret";
    expect(getStorage().publicUrl("a/b.png")).toBe("https://abc123.public.blob.vercel-storage.com/a/b.png");
  });
});
