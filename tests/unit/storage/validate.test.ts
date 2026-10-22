import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, sniffType, validateUpload } from "@/lib/storage/validate";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const WEBP = [..."RIFF"].map((c) => c.charCodeAt(0)).concat([1, 2, 3, 4], [..."WEBP"].map((c) => c.charCodeAt(0)));
const HEIC = [0, 0, 0, 0x18, ..."ftypheic"].map((c) => (typeof c === "string" ? c.charCodeAt(0) : c));
const PDF = [..."%PDF-1.7"].map((c) => c.charCodeAt(0));
const bytes = (a: number[]) => new Uint8Array(a);

describe("sniffType", () => {
  it("recognises each supported type by magic bytes", () => {
    expect(sniffType(bytes(JPEG))).toBe("image/jpeg");
    expect(sniffType(bytes(PNG))).toBe("image/png");
    expect(sniffType(bytes(WEBP))).toBe("image/webp");
    expect(sniffType(bytes(HEIC))).toBe("image/heic");
    expect(sniffType(bytes(PDF))).toBe("application/pdf");
  });

  it("returns null for anything else", () => {
    expect(sniffType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffType(bytes([]))).toBeNull();
    expect(sniffType(bytes([0xff, 0xd8]))).toBeNull();
  });

  it("does not take a RIFF container that is not WebP", () => {
    const wav = [..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WAVE"].map((c) => c.charCodeAt(0)));
    expect(sniffType(bytes(wav))).toBeNull();
  });
});

describe("validateUpload", () => {
  it("accepts a JPEG and derives the extension from the bytes", () => {
    expect(validateUpload(bytes(JPEG), "image", "image/jpeg")).toEqual({
      ok: true,
      contentType: "image/jpeg",
      extension: "jpg",
      size: JPEG.length,
    });
  });

  it("accepts aliases and missing declared types", () => {
    expect(validateUpload(bytes(JPEG), "image", "image/jpg").ok).toBe(true);
    expect(validateUpload(bytes(HEIC), "image", "image/heif").ok).toBe(true);
    expect(validateUpload(bytes(HEIC), "image", "").ok).toBe(true);
    expect(validateUpload(bytes(PNG), "image", "application/octet-stream").ok).toBe(true);
  });

  it("refuses a declared type that contradicts the bytes", () => {
    expect(validateUpload(bytes(PNG), "image", "image/jpeg")).toEqual({ ok: false, code: "type_mismatch" });
  });

  it("refuses a script renamed as an image", () => {
    const script = new TextEncoder().encode("<script>alert(1)</script>");
    expect(validateUpload(script, "image", "image/jpeg")).toEqual({ ok: false, code: "unsupported_type" });
  });

  it("allows PDFs only in the evidence profile", () => {
    expect(validateUpload(bytes(PDF), "image")).toEqual({ ok: false, code: "unsupported_type" });
    expect(validateUpload(bytes(PDF), "evidence", "application/pdf").ok).toBe(true);
  });

  it("refuses empty and oversized files", () => {
    expect(validateUpload(bytes([]), "image")).toEqual({ ok: false, code: "empty" });
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(JPEG);
    expect(validateUpload(big, "image")).toEqual({ ok: false, code: "too_large" });
  });
});
