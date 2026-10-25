/**
 * Daily personal data retention job (see vercel.json). Vercel Cron calls this
 * with `Authorization: Bearer <CRON_SECRET>`; anything else is refused. With
 * no `CRON_SECRET` set the route is closed to everyone.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredPii } from "@/lib/cases/retention";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

function authorised(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorised(request, secret)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const result = await purgeExpiredPii(getDb(), new Date(), getStorage);
  return NextResponse.json(result);
}
