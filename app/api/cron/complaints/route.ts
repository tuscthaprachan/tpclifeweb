/**
 * Daily complaints job (see vercel.json): closes resolved complaints whose
 * reopen window has passed, flags complaints that missed a target as
 * escalated and emails the leads, and sweeps abandoned journeys. Vercel Cron
 * calls this with `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. With no `CRON_SECRET` set the route is closed to everyone.
 */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runComplaintsDaily } from "@/lib/complaints/cron";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site-url";
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
  const result = await runComplaintsDaily(getDb(), new Date(), { origin: SITE_URL, getStorage });
  return NextResponse.json(result);
}
