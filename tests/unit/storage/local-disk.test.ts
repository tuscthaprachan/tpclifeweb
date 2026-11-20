import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalDiskStorage } from "@/lib/storage/local-disk";

const data = new Uint8Array([1, 2, 3]);
const priv = { visibility: "private", contentType: "image/png", maxBytes: 100 } as const;
const pub = { visibility: "public", contentType: "image/png", maxBytes: 100 } as const;

let root: string;
let now = 1_700_000_000_000;
const make = () => new LocalDiskStorage({ root, signingSecret: "test-secret-test-secret-test-secret" }, () => now);

async function read(stream: ReadableStream<Uint8Array>): Promise<number[]> {
  return [...new Uint8Array(await new Response(stream).arrayBuffer())];
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "trytpc-storage-"));
  now = 1_700_000_000_000;
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("LocalDiskStorage", () => {
  it("round-trips an object", async () => {
    const s = make();
    expect(await s.put("lf/items/a.png", data, priv)).toMatchObject({ key: "lf/items/a.png", size: 3, visibility: "private", url: undefined });
    const got = await s.get("lf/items/a.png");
    expect(got?.contentType).toBe("image/png");
    expect(await read(got!.body)).toEqual([1, 2, 3]);
  });

  it("refuses overwrites and oversize bodies", async () => {
    const s = make();
    await s.put("a/b.png", data, pub);
    await expect(s.put("a/b.png", data, pub)).rejects.toMatchObject({ code: "backend" });
    await expect(s.put("a/c.png", data, { ...pub, maxBytes: 2 })).rejects.toMatchObject({ code: "too_large" });
  });

  it("keeps public and private objects apart", async () => {
    const s = make();
    await s.put("p/x.png", data, pub);
    await s.put("q/y.png", data, priv);
    expect(s.publicUrl("p/x.png")).toBe("/files/p/x.png");
    expect(await s.read("p/x.png", "public")).not.toBeNull();
    expect(await s.read("q/y.png", "public")).toBeNull();
    expect(await s.read("q/y.png", "private")).not.toBeNull();
  });

  it("signs private links that expire", async () => {
    const s = make();
    await s.put("q/y.png", data, priv);
    const url = new URL(await s.signedReadUrl("q/y.png", { expiresInSeconds: 60 }), "http://x");
    const exp = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");
    expect(s.isSignatureValid("q/y.png", exp, sig)).toBe(true);
    expect(s.isSignatureValid("q/z.png", exp, sig)).toBe(false);
    expect(s.isSignatureValid("q/y.png", String(Number(exp) + 1), sig)).toBe(false);
    now += 61_000;
    expect(s.isSignatureValid("q/y.png", exp, sig)).toBe(false);
  });

  it("deletes and tolerates missing keys", async () => {
    const s = make();
    await s.put("a/b.png", data, pub);
    await s.delete("a/b.png");
    await s.delete("a/b.png");
    expect(await s.get("a/b.png")).toBeNull();
  });

  it("rejects path traversal", async () => {
    const s = make();
    await expect(s.put("../x.png", data, pub)).rejects.toMatchObject({ code: "invalid_key" });
  });
});
