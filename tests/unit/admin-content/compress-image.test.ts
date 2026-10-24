import { describe, expect, it, vi } from "vitest";
import {
  chooseTarget,
  COMPRESS_MAX_SIDE,
  COMPRESS_QUALITIES,
  compressImage,
  formatMegabytes,
  planSteps,
  startingSize,
  type CompressDeps,
  type CompressTarget,
} from "@/components/admin/content/compress-image";
import { sniffType } from "@/lib/storage/validate";

const MB = 1024 * 1024;
const CAP = 4 * MB;
const fileOf = (bytes: number, name = "photo.png", type = "image/png") => new File([new Uint8Array(bytes)], name, { type });

/** Deps whose encode returns a blob of whatever size `sizeFor` says. */
function fakeDeps(opts: { width?: number; height?: number; transparent?: boolean; webp?: boolean; sizeFor: (type: CompressTarget, w: number, h: number, q: number) => number | null }) {
  const encode = vi.fn(async (type: CompressTarget, w: number, h: number, q: number) => {
    const size = opts.sizeFor(type, w, h, q);
    return size === null ? null : new Blob([new Uint8Array(size)], { type });
  });
  const decode = vi.fn(async () => ({ width: opts.width ?? 4000, height: opts.height ?? 3000, hasTransparency: opts.transparent ?? false }));
  const supportsWebp = vi.fn(async () => opts.webp ?? true);
  const deps: CompressDeps = { decode, encode, supportsWebp };
  return { deps, encode, decode, supportsWebp };
}

describe("planSteps", () => {
  it("caps the longest side and keeps the aspect ratio", () => {
    expect(startingSize(5120, 2560)).toEqual({ width: COMPRESS_MAX_SIDE, height: 1280 });
    expect(startingSize(1000, 800)).toEqual({ width: 1000, height: 800 });
  });

  it("tries every quality at one size before shrinking", () => {
    const steps = planSteps(4000, 3000);
    expect(steps.slice(0, 4).map((s) => s.quality)).toEqual([...COMPRESS_QUALITIES]);
    expect(new Set(steps.slice(0, 4).map((s) => s.width))).toEqual(new Set([2560]));
    expect(steps[4]).toMatchObject({ width: 1920, height: 1440 });
    expect(steps.length).toBe(16);
  });

  it("does not repeat a size that rounds to the same pixels", () => {
    const keys = planSteps(1, 1).map((s) => `${s.width}x${s.height}`);
    expect(new Set(keys).size).toBe(1);
  });
});

describe("chooseTarget", () => {
  it("keeps transparency in WebP only when the browser can write it", () => {
    expect(chooseTarget(true, true)).toBe("image/webp");
    expect(chooseTarget(true, false)).toBe("image/jpeg");
    expect(chooseTarget(false, true)).toBe("image/jpeg");
  });
});

describe("compressImage", () => {
  it("leaves a file under the cap alone and never decodes it", async () => {
    const { deps, decode } = fakeDeps({ sizeFor: () => 1 });
    const file = fileOf(CAP);
    expect(await compressImage(file, deps)).toEqual({ status: "unchanged", file });
    expect(decode).not.toHaveBeenCalled();
  });

  it("uses the first quality that fits, as a JPEG with a matching name and type", async () => {
    const { deps, encode } = fakeDeps({ sizeFor: (_t, _w, _h, q) => (q <= 0.75 ? 2 * MB : 6 * MB) });
    const result = await compressImage(fileOf(9 * MB, "Holiday.PNG"), deps);
    expect(result).toMatchObject({ status: "compressed", originalBytes: 9 * MB, compressedBytes: 2 * MB });
    if (result.status !== "compressed") throw new Error("unreachable");
    expect(result.file.name).toBe("Holiday.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(encode.mock.calls.map((c) => c[3])).toEqual([0.85, 0.75]);
    expect(encode.mock.calls[0]).toMatchObject({ 1: 2560, 2: 1920 });
  });

  it("steps down in size when no quality fits", async () => {
    const { deps, encode } = fakeDeps({ sizeFor: (_t, w) => (w <= 1920 ? 3 * MB : 8 * MB) });
    const result = await compressImage(fileOf(12 * MB, "big.jpg", "image/jpeg"), deps);
    expect(result).toMatchObject({ status: "compressed", compressedBytes: 3 * MB });
    expect(encode).toHaveBeenCalledTimes(5);
    expect(encode.mock.calls[4]).toMatchObject({ 1: 1920, 3: 0.85 });
  });

  it("writes transparent pictures as WebP when supported, JPEG when not", async () => {
    const webp = fakeDeps({ transparent: true, webp: true, sizeFor: () => MB });
    const a = await compressImage(fileOf(9 * MB, "logo.png"), webp.deps);
    expect(a).toMatchObject({ status: "compressed" });
    if (a.status === "compressed") expect([a.file.type, a.file.name]).toEqual(["image/webp", "logo.webp"]);

    const noWebp = fakeDeps({ transparent: true, webp: false, sizeFor: () => MB });
    const b = await compressImage(fileOf(9 * MB, "logo.png"), noWebp.deps);
    if (b.status === "compressed") expect(b.file.type).toBe("image/jpeg");
    else throw new Error("expected compressed");
  });

  it("does not ask about WebP for opaque pictures", async () => {
    const { deps, supportsWebp } = fakeDeps({ sizeFor: () => MB });
    await compressImage(fileOf(9 * MB), deps);
    expect(supportsWebp).not.toHaveBeenCalled();
  });

  it("fails with too_large when every step is still over the cap", async () => {
    const { deps, encode } = fakeDeps({ sizeFor: () => 5 * MB });
    expect(await compressImage(fileOf(30 * MB), deps)).toEqual({ status: "failed", reason: "too_large" });
    expect(encode).toHaveBeenCalledTimes(16);
  });

  it("fails with decode when the browser cannot read the file, or cannot encode", async () => {
    const unreadable: CompressDeps = { decode: async () => Promise.reject(new Error("bad")), encode: async () => null, supportsWebp: async () => false };
    expect(await compressImage(fileOf(9 * MB, "p.heic", "image/heic"), unreadable)).toEqual({ status: "failed", reason: "decode" });
    const { deps } = fakeDeps({ sizeFor: () => null });
    expect(await compressImage(fileOf(9 * MB), deps)).toEqual({ status: "failed", reason: "decode" });
  });

  it("treats a blob of the wrong type (a browser that ignored the request) as unsupported", async () => {
    const deps: CompressDeps = {
      decode: async () => ({ width: 100, height: 100, hasTransparency: false }),
      encode: async () => new Blob([new Uint8Array(10)], { type: "image/png" }),
      supportsWebp: async () => false,
    };
    expect(await compressImage(fileOf(9 * MB), deps)).toEqual({ status: "failed", reason: "decode" });
  });
});

describe("server compatibility", () => {
  it("produces types the upload validator sniffs as accepted images", () => {
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });
});

describe("formatMegabytes", () => {
  it("shows one decimal place", () => {
    expect(formatMegabytes(9.2 * MB)).toBe("9.2");
    expect(formatMegabytes(2.14 * MB)).toBe("2.1");
  });
});
