import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getNotification, markRead, safeConsoleHref } from "@/lib/notifications/read";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opening a notification marks it read and goes to what it is about. Works without JavaScript, since it is a plain link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const staff = await requireStaff();
  const { id } = await params;
  const target = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  if (!UUID.test(id)) return target("/admin/notifications");
  const db = getDb();
  const row = await getNotification(db, staff.user.id, id);
  if (!row) return target("/admin/notifications");
  if (!row.readAt && (await markRead(db, staff.user.id, [id])) > 0) revalidatePath("/admin", "layout");
  return target(safeConsoleHref(row.href));
}
