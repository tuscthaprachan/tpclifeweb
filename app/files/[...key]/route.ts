import { getDiskStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf"]);

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const storage = getDiskStorage();
  if (!storage) return new Response("Not found", { status: 404 });
  const key = (await params).key.join("/");
  const url = new URL(request.url);
  const signed = url.searchParams.has("sig");

  let object;
  try {
    if (signed) {
      if (!storage.isSignatureValid(key, url.searchParams.get("exp"), url.searchParams.get("sig"))) {
        return new Response("Not found", { status: 404 });
      }
      object = await storage.read(key, "private");
    } else {
      object = await storage.read(key, "public");
    }
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!object) return new Response("Not found", { status: 404 });

  const fileName = key.split("/").pop() ?? "file";
  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Content-Disposition": `${INLINE.has(object.contentType) ? "inline" : "attachment"}; filename="${fileName}"`,
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": signed ? "private, no-store" : "public, max-age=31536000, immutable",
      ...(signed ? { "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } : {}),
    },
  });
}
