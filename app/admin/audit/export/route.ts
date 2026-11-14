import { NextResponse, type NextRequest } from "next/server";
import { auditCsv, exportAuditEntries, parseAuditFilters } from "@/lib/admin/audit/query";
import { isAuthConfigured } from "@/lib/auth";
import { decideAccess } from "@/lib/auth/access";
import { auditContextFor, getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { withAudit } from "@/lib/db/audit";
import { dayKeyOf } from "@/lib/borrowing/time";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** The filtered audit log as CSV, for administrators only. The download is itself recorded as `audit.export`. */
export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: HEADERS });
  const staff = await getAdminSession();
  const verdict = staff ? decideAccess({ session: { ...staff.times, secondFactorAt: staff.secondFactorAt }, now: new Date(), roles: staff.roles, required: { role: "admin" } }) : null;
  if (!staff || verdict?.kind !== "ok") return NextResponse.json({ error: "forbidden" }, { status: staff ? 403 : 401, headers: HEADERS });

  const filters = parseAuditFilters(Object.fromEntries(request.nextUrl.searchParams));
  const db = getDb();
  const rows = await exportAuditEntries(db, filters, staff.user.id);
  const { page: _page, ...applied } = filters;
  await withAudit(db, await auditContextFor(staff), async (_tx, audit) => {
    await audit({ action: "audit.export", entityType: "audit_log", entityId: "csv", after: { filters: Object.fromEntries(Object.entries(applied).filter(([, v]) => v !== undefined)), rows: rows.length } });
  });

  return new NextResponse(auditCsv(rows), {
    headers: { ...HEADERS, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="audit-log-${dayKeyOf(new Date())}.csv"` },
  });
}
