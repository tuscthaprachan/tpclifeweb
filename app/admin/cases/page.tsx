import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, EmptyState, Heading, Pagination, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { accessibleServices, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { listCases, type CaseListRow } from "@/lib/cases/engine";
import { allStatuses, getServiceDef, getStatusDef, SERVICES, type CaseService } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("casesTitle");
}

type Query = { service?: string; status?: string; assignee?: string; q?: string; open?: string; page?: string };

const field = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900";

export default async function CasesInboxPage({ searchParams }: { searchParams: Promise<Query> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const query = await searchParams;

  const services = accessibleServices(staff.roles);
  const service = services.find((s) => s === query.service);
  const statuses = (service ? allStatuses(service) : services.flatMap((s) => allStatuses(s))).filter((s, i, all) => all.findIndex((o) => o.key === s.key) === i);
  const status = statuses.find((s) => s.key === query.status)?.key;
  const assignee = query.assignee === "me" || query.assignee === "unassigned" ? query.assignee : undefined;
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
  const actor = await staffActorFor(staff, services[0]!);
  const list = await listCases(getDb(), actor, { service, status, assignee, q: query.q, openOnly: query.open === "1", page });
  const filtered = Boolean(service || status || assignee || query.q?.trim() || query.open === "1");
  const totalPages = Math.max(Math.ceil(list.total / list.pageSize), 1);

  const params = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ service, status, assignee, q: query.q?.trim(), open: query.open === "1" ? "1" : undefined })) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/admin/cases?${qs}` : "/admin/cases";
  };

  const columns: DataTableColumn<CaseListRow>[] = [
    {
      id: "reference",
      header: a("casesColReference", locale),
      cell: (row) => (
        <a href={`/admin/cases/${row.id}`} className="font-medium">
          {row.reference}
          <span className="visually-hidden"> {a("casesOpenCase", locale)}</span>
        </a>
      ),
    },
    {
      id: "type",
      header: a("casesColType", locale),
      cell: (row) => `${pick(getServiceDef(row.service).label, locale)}, ${pick(SERVICES[row.service].kinds[row.kind]?.label, locale)}`,
    },
    { id: "summary", header: a("casesColSummary", locale), cell: (row) => row.summary ?? "" },
    {
      id: "status",
      header: a("casesColStatus", locale),
      cell: (row) => {
        const def = getStatusDef(row.service, row.kind, row.status);
        return <StatusTag tone={def?.tone ?? "neutral"} label={def ? pick(def.label, locale) : row.status} />;
      },
    },
    { id: "assigned", header: a("casesColAssigned", locale), cell: (row) => row.assigneeName ?? a("casesUnassigned", locale) },
    { id: "updated", header: a("casesColUpdated", locale), cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
  ];

  return (
    <AdminPage width="content">
      <div>
        <Heading level={1}>{a("casesTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("casesIntro", locale)}</p>
      </div>

      <form method="get" role="search" className="flex flex-wrap items-end gap-[var(--space-3)]">
        {services.length > 1 ? (
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="cases-service" className="text-base font-medium">
              {a("casesFilterService", locale)}
            </label>
            <select id="cases-service" name="service" defaultValue={service ?? ""} className={field}>
              <option value="">{a("casesFilterAllServices", locale)}</option>
              {services.map((s: CaseService) => (
                <option key={s} value={s}>
                  {pick(SERVICES[s].label, locale)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="cases-status" className="text-base font-medium">
            {a("casesFilterStatus", locale)}
          </label>
          <select id="cases-status" name="status" defaultValue={status ?? ""} className={field}>
            <option value="">{a("casesFilterAllStatuses", locale)}</option>
            {statuses.map((s) => (
              <option key={s.key} value={s.key}>
                {pick(s.label, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="cases-assignee" className="text-base font-medium">
            {a("casesFilterAssignee", locale)}
          </label>
          <select id="cases-assignee" name="assignee" defaultValue={assignee ?? ""} className={field}>
            <option value="">{a("casesFilterAnyone", locale)}</option>
            <option value="me">{a("casesFilterMe", locale)}</option>
            <option value="unassigned">{a("casesFilterUnassigned", locale)}</option>
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="cases-q" className="text-base font-medium">
            {a("casesFilterReference", locale)}
          </label>
          <input id="cases-q" type="search" name="q" defaultValue={query.q} autoComplete="off" className={field} />
        </div>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="open" value="1" defaultChecked={query.open === "1"} />
          {a("casesFilterOpenOnly", locale)}
        </label>
        <Button type="submit" variant="secondary">
          {a("casesFilterApply", locale)}
        </Button>
        {filtered ? (
          <Button href="/admin/cases" variant="quiet">
            {a("casesFilterClear", locale)}
          </Button>
        ) : null}
      </form>

      <p className="m-0 text-ink-600" role="status">
        {list.total === 1 ? a("casesTotalOne", locale) : a("casesTotal", locale, { count: formatNumber(list.total, locale) })}
      </p>
      {list.rows.length === 0 ? (
        <EmptyState title={a("casesNone", locale)} />
      ) : (
        <DataTable columns={columns} rows={list.rows} getRowKey={(r) => r.id} caption={a("casesTitle", locale)} />
      )}
      <Pagination currentPage={list.page} totalPages={totalPages} buildHref={params} locale={locale} />
    </AdminPage>
  );
}
