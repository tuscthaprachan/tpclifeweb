import { compressImage, type CompressDeps, type CompressResult, type CompressTarget, type DecodedImage } from "./compress-image";

type Canvas2D = OffscreenCanvas | HTMLCanvasElement;

const ALPHA_TYPES = new Set(["image/png", "image/webp", "image/gif"]);

function makeCanvas(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: Canvas2D): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("no 2d context");
  return ctx;
}

async function toBlob(canvas: Canvas2D, type: string, quality?: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Looks at a small copy of the picture for any pixel that is not fully opaque. */
function detectTransparency(bitmap: ImageBitmap): boolean {
  const size = 64;
  const canvas = makeCanvas(size, size);
  const ctx = context(canvas);
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true;
  return false;
}

/** Wires `compressImage` to createImageBitmap and a canvas. Browser only. */
export function browserDeps(): CompressDeps {
  let bitmap: ImageBitmap | null = null;
  let webp: Promise<boolean> | null = null;
  return {
    async decode(file: Blob): Promise<DecodedImage> {
      bitmap?.close();
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { width: bitmap.width, height: bitmap.height, hasTransparency: ALPHA_TYPES.has(file.type) && detectTransparency(bitmap) };
    },
    async encode(type: CompressTarget, width: number, height: number, quality: number) {
      if (!bitmap) return null;
      const canvas = makeCanvas(width, height);
      const ctx = context(canvas);
      if (type === "image/jpeg") {
        // JPEG has no alpha; flatten onto white rather than black.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
      return toBlob(canvas, type, quality);
    },
    supportsWebp() {
      webp ??= (async () => {
        const canvas = makeCanvas(1, 1);
        context(canvas);
        const blob = await toBlob(canvas, "image/webp", 0.5);
        return blob?.type === "image/webp";
      })().catch(() => false);
      return webp;
    },
  };
}

/** Shrinks a picked file to fit the upload cap using this browser's canvas. */
export async function compressInBrowser(file: File): Promise<CompressResult> {
  return compressImage(file, browserDeps());
}
