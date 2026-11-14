/**
 * Starts a preview: an editor or administrator posts the item to preview, and
 * is sent to its public page with Draft Mode on (which switches off every
 * cache for them and nobody else). POST rather than GET because it sets a
 * cookie. Needs a signed-in editor; never cached.
 */

import { eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { PREVIEW_ROUTE } from "@/lib/admin/content/capabilities";
import { canEditContent } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { lifecycleType } from "@/lib/admin/content/lifecycle";
import { getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403, headers: NO_STORE });

  const staff = await getAdminSession();
  if (!staff || !canEditContent(staff.roles)) return new NextResponse(null, { status: 403, headers: NO_STORE });

  const form = await request.formData();
  const segment = String(form.get("segment") ?? "");
  const id = String(form.get("id") ?? "");
  const rawLocale = String(form.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const found = lifecycleType(segment);
  const route = PREVIEW_ROUTE[segment];
  if (!found || !route || !isUuid(id)) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const table = found.def.table as unknown as { id: AnyPgColumn; slug: AnyPgColumn };
  const [row] = (await getDb().select({ slug: table.slug }).from(found.def.table).where(eq(table.id, id)).limit(1)) as { slug: string }[];
  if (!row?.slug) return new NextResponse(null, { status: 404, headers: NO_STORE });

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(`/${locale}${route}/${row.slug}`, request.url), { status: 303, headers: NO_STORE });
}
