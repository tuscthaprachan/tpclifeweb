/** Ends a preview (turns Draft Mode off) and returns to the staff console. */

import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return new NextResponse(null, { status: 403 });

  const form = await request.formData();
  const returnTo = String(form.get("returnTo") ?? "");
  const safe = /^\/admin(\/[A-Za-z0-9._~\-/]*)?$/.test(returnTo) ? returnTo : "/admin";
  (await draftMode()).disable();
  return NextResponse.redirect(new URL(safe, request.url), { status: 303, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
