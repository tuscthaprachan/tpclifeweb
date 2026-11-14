import { notFound } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { accessibleServices } from "@/lib/cases/access";
import { buildCaseCsv } from "@/lib/cases/export";
import { inboxParams, parseInboxQuery } from "@/lib/cases/inbox-query";
import { allStatuses, type CaseService } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { withAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

/**
 * The current filtered inbox as a CSV for Excel. Officers and administrators
 * only (editors have no case access). It holds no personal data and leaves out
 * restricted complaints the person is not named on; each export is audited as
 * `case.export`.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthConfigured()) notFound();
  await getAdminLocale();
  const staff = await requireStaff(["officer", "admin"]);
  const services = accessibleServices(staff.roles);
  if (services.length === 0) notFound();
  const url = new URL(request.url);
  const raw = Object.fromEntries(["service", "status", "assignee", "q", "open", "overdue", "escalated", "sort", "dir"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
  const statuses = services.flatMap((s) => allStatuses(s)).map((s) => s.key);
  const query = parseInboxQuery(raw, { services, statuses });
  const db = getDb();
  const actor = await staffActorFor(staff, services[0]!);
  const { csv, count, truncated } = await buildCaseCsv(db, actor, {
    service: query.service as CaseService | undefined,
    status: query.status,
    assignee: query.assignee,
    q: query.q,
    openOnly: query.open,
    overdue: query.overdue,
    escalated: query.escalated,
    sort: query.sort,
    dir: query.dir,
  });

  await withAudit(db, await auditContextFor(staff, actor.organisationId), async (_tx, audit) => {
    await audit({ action: "case.export", entityType: "case_export", entityId: "inbox", after: { count, truncated, filters: inboxParams({ ...query, sort: undefined, dir: undefined, page: 1 }), sort: query.sort, dir: query.dir } });
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cases-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
