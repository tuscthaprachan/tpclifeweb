import { NextResponse, type NextRequest } from "next/server";
import { getAdminLocale } from "@/lib/admin/locale";
import { SEARCH_MIN_CHARS, searchConsole } from "@/lib/admin/search/search";
import { isAuthConfigured } from "@/lib/auth";
import { decideAccess } from "@/lib/auth/access";
import { getAdminSession } from "@/lib/auth/session";
import { accessibleServices } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** Console-wide search for the command palette. Same gate as the pages: a live passkey session with a staff role, else 401. */
export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ results: [] }, { status: 503, headers: HEADERS });
  const staff = await getAdminSession();
  const verdict = staff
    ? decideAccess({ session: { ...staff.times, secondFactorAt: staff.secondFactorAt }, now: new Date(), roles: staff.roles, required: {} })
    : null;
  if (!staff || verdict?.kind !== "ok") return NextResponse.json({ results: [] }, { status: 401, headers: HEADERS });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < SEARCH_MIN_CHARS) return NextResponse.json({ results: [] }, { headers: HEADERS });
  const locale = await getAdminLocale();
  const services = accessibleServices(staff.roles);
  const actor = services[0] ? await staffActorFor(staff, services[0]) : null;
  const results = await searchConsole(getDb(), { roles: staff.roles, actor, q, locale });
  return NextResponse.json({ results }, { headers: HEADERS });
}
