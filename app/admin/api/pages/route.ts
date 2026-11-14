import { NextResponse, type NextRequest } from "next/server";
import { getAdminLocale } from "@/lib/admin/locale";
import { PAGE_SEARCH_MIN_CHARS, searchPageLinks } from "@/lib/admin/pages/links";
import { isAuthConfigured } from "@/lib/auth";
import { decideAccess } from "@/lib/auth/access";
import { getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** Pages of the public site for the rich text link dialog. Same gate as the console search: a live passkey session with a staff role, else 401. */
export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ results: [] }, { status: 503, headers: HEADERS });
  const staff = await getAdminSession();
  const verdict = staff
    ? decideAccess({ session: { ...staff.times, secondFactorAt: staff.secondFactorAt }, now: new Date(), roles: staff.roles, required: {} })
    : null;
  if (!staff || verdict?.kind !== "ok") return NextResponse.json({ results: [] }, { status: 401, headers: HEADERS });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < PAGE_SEARCH_MIN_CHARS) return NextResponse.json({ results: [] }, { headers: HEADERS });
  const results = await searchPageLinks(getDb(), { roles: staff.roles, q, locale: await getAdminLocale() });
  return NextResponse.json({ results }, { headers: HEADERS });
}
