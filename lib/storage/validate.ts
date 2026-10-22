/**
 * Upload validation.
 *
 * The client's `Content-Type` and file name are advisory. The type is decided
 * by sniffing magic bytes, and the extension we store is derived from that, so
 * a script renamed `photo.jpg` is refused and a real photo with no extension is
 * accepted. Validation here is a gate, not a sanitiser: re-encoding images
 * (stripping EXIF, location) is a separate step.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";

export const EXTENSION: Record<SniffedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

const IMAGE_TYPES: readonly SniffedType[] = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/** What a given upload field accepts. */
export const UPLOAD_PROFILES = {
  /** Content images and found-item photos. */
  image: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
  /** Complaint evidence: photos or a PDF. */
  evidence: { types: [...IMAGE_TYPES, "application/pdf"] as readonly SniffedType[], maxBytes: MAX_PDF_BYTES },
} as const;

export type UploadProfile = keyof typeof UPLOAD_PROFILES;

export type UploadErrorCode = "empty" | "too_large" | "unsupported_type" | "type_mismatch";

export type UploadCheck =
  | { ok: true; contentType: SniffedType; extension: string; size: number }
  | { ok: false; code: UploadErrorCode };

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

// ISO base media brands used by HEIC/HEIF stills from iPhones and Android.
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);

/** Identifies a file by its first bytes. Null when it is none of the types we know. */
export function sniffType(bytes: Uint8Array): SniffedType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp" && HEIC_BRANDS.has(ascii(bytes, 8, 4))) return "image/heic";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // "%PDF-"
  return null;
}

/** Normalises the aliases browsers send so they compare equal to what we sniff. */
function normaliseDeclared(declared: string): string {
  const base = declared.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpg" || base === "image/pjpeg") return "image/jpeg";
  if (base === "image/heif") return "image/heic";
  return base;
}

/**
 * Checks size, sniffs the type, and compares with what the client declared.
 * An empty or generic declared type is tolerated (some browsers send none for
 * HEIC); a specific one that contradicts the bytes is refused.
 */
export function validateUpload(bytes: Uint8Array, profile: UploadProfile, declaredType?: string): UploadCheck {
  const { types, maxBytes } = UPLOAD_PROFILES[profile];
  if (bytes.length === 0) return { ok: false, code: "empty" };
  if (bytes.length > maxBytes) return { ok: false, code: "too_large" };

  const sniffed = sniffType(bytes);
  if (!sniffed || !types.includes(sniffed)) return { ok: false, code: "unsupported_type" };

  const declared = declaredType ? normaliseDeclared(declaredType) : "";
  if (declared && declared !== "application/octet-stream" && declared !== sniffed) {
    return { ok: false, code: "type_mismatch" };
  }
  return { ok: true, contentType: sniffed, extension: EXTENSION[sniffed], size: bytes.length };
}
