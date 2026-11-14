/**
 * The redirect table for `proxy.ts`. GET returns the flattened map (read
 * through the data cache, tag `redirects`, so a change in the console shows
 * on the next fetch). POST adds hit counts the proxy has gathered; it needs
 * `Authorization: Bearer <CRON_SECRET>`, and without that secret no hits are
 * recorded. The map is only site paths, so GET is open.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "@/lib/content/cache";
import { getDb } from "@/lib/db";
import { loadRedirectMap, recordRedirectHits } from "@/lib/redirects/store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

const cachedMap = cachedRead(["redirect-map"], [CACHE_TAGS.redirects], REVALIDATE.content, () => loadRedirectMap(getDb()));

export async function GET() {
  try {
    return NextResponse.json({ map: await cachedMap() }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}

function authorised(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });
  if (!authorised(request, secret)) return NextResponse.json({ error: "unauthorised" }, { status: 401, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { hits?: Record<string, unknown> } | null;
  const hits: Record<string, number> = {};
  for (const [path, n] of Object.entries(body?.hits ?? {})) {
    if (typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 1_000_000) hits[path] = n;
  }
  const updated = await recordRedirectHits(getDb(), hits);
  return NextResponse.json({ updated }, { headers: NO_STORE });
}
