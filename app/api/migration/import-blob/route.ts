import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/admin/health/with-cron-auth";
import { importBlobBatch } from "@/lib/migration/blob-import";
import { getDiskStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!cronAuthorised(request, secret)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not set" }, { status: 503 });
  const storage = getDiskStorage();
  if (!storage) return NextResponse.json({ error: "STORAGE_DIR is not set" }, { status: 503 });
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  try {
    return NextResponse.json(await importBlobBatch(storage, token, cursor));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}
