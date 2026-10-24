import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";

/** The longest side a compressed picture keeps, in pixels. */
export const COMPRESS_MAX_SIDE = 2560;
/** JPEG/WebP qualities tried at each size, best first. */
export const COMPRESS_QUALITIES = [0.85, 0.75, 0.65, 0.5] as const;
/** Fractions of the starting size tried in turn once every quality has failed. */
export const COMPRESS_SCALES = [1, 0.75, 0.5, 0.35] as const;

export type CompressTarget = "image/jpeg" | "image/webp";

/** One encode attempt. */
export interface CompressStep {
  width: number;
  height: number;
  quality: number;
}

/** A decoded picture. `hasTransparency` is only worth computing for formats that can have it. */
export interface DecodedImage {
  width: number;
  height: number;
  hasTransparency: boolean;
}

/** The browser parts, passed in so the decisions can be tested without a canvas. */
export interface CompressDeps {
  decode(file: Blob): Promise<DecodedImage>;
  /** Draws the picture at the given size and encodes it. Null when the browser cannot encode that type. */
  encode(type: CompressTarget, width: number, height: number, quality: number): Promise<Blob | null>;
  supportsWebp(): Promise<boolean>;
}

export type CompressResult =
  | { status: "unchanged"; file: File }
  | { status: "compressed"; file: File; originalBytes: number; compressedBytes: number }
  | { status: "failed"; reason: "decode" | "too_large" };

/** The size every step is measured from: the original, with its longest side capped. */
export function startingSize(width: number, height: number, maxSide = COMPRESS_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Every attempt in order: all qualities at one size, then the next size down. Sizes that round to the same pixels are not repeated. */
export function planSteps(width: number, height: number, maxSide = COMPRESS_MAX_SIDE): CompressStep[] {
  const start = startingSize(width, height, maxSide);
  const steps: CompressStep[] = [];
  const seen = new Set<string>();
  for (const scale of COMPRESS_SCALES) {
    const w = Math.max(1, Math.round(start.width * scale));
    const h = Math.max(1, Math.round(start.height * scale));
    const key = `${w}x${h}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const quality of COMPRESS_QUALITIES) steps.push({ width: w, height: h, quality });
  }
  return steps;
}

/** Transparent pictures keep their alpha in WebP when the browser can write it; everything else becomes JPEG. */
export function chooseTarget(hasTransparency: boolean, webp: boolean): CompressTarget {
  return hasTransparency && webp ? "image/webp" : "image/jpeg";
}

function renamed(name: string, type: CompressTarget): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "picture";
  return `${base}.${type === "image/webp" ? "webp" : "jpg"}`;
}

/**
 * Shrinks a picture to fit under the upload cap. A file already under it is
 * returned untouched. Otherwise the picture is re-encoded at falling quality,
 * then at smaller sizes, and the first result that fits is used.
 */
export async function compressImage(file: File, deps: CompressDeps, maxBytes = ADMIN_UPLOAD_MAX_BYTES): Promise<CompressResult> {
  if (file.size <= maxBytes) return { status: "unchanged", file };

  let decoded: DecodedImage;
  try {
    decoded = await deps.decode(file);
  } catch {
    return { status: "failed", reason: "decode" };
  }

  const target = chooseTarget(decoded.hasTransparency, decoded.hasTransparency ? await deps.supportsWebp() : false);
  for (const step of planSteps(decoded.width, decoded.height)) {
    let blob: Blob | null;
    try {
      blob = await deps.encode(target, step.width, step.height, step.quality);
    } catch {
      blob = null;
    }
    if (!blob || blob.type !== target) return { status: "failed", reason: "decode" };
    if (blob.size > 0 && blob.size <= maxBytes) {
      return {
        status: "compressed",
        file: new File([blob], renamed(file.name, target), { type: target, lastModified: file.lastModified }),
        originalBytes: file.size,
        compressedBytes: blob.size,
      };
    }
  }
  return { status: "failed", reason: "too_large" };
}

/** Megabytes to one decimal place, for the "Compressed from 9.2 MB to 2.1 MB" note. */
export function formatMegabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}
