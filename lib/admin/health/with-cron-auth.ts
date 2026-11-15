import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { runRecordedCron } from "./cron-run";

/** True when the request carries `Authorization: Bearer <secret>`, compared in constant time. */
export function cronAuthorised(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/**
 * The route handler for a scheduled job. Closed (503) with no `CRON_SECRET`,
 * refused (401) without it, otherwise runs the job and records the run, or the
 * failure (500), under `name` for the health page.
 */
export function withCronAuth<T extends object>(name: string, job: (db: AuditExecutor, now: Date) => Promise<T>) {
  return async function GET(request: Request): Promise<Response> {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (!cronAuthorised(request, secret)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    const db = getDb();
    try {
      return NextResponse.json(await runRecordedCron(db, name, () => job(db, new Date())));
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  };
}
