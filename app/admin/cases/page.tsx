import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, EmptyPanel, FilterChips, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { Button, DataTable, Pagination, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
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
import { Glyph } from "./SectionCard";
import { serviceIcon } from "./icons";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("casesTitle");
}

type Query = { service?: string; status?: string; assignee?: string; q?: string; open?: string; overdue?: string; escalated?: string; page?: string };

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
  const list = await listCases(getDb(), actor, { service, status, assignee, q: query.q, openOnly: query.open === "1", overdue: query.overdue === "1", escalated: query.escalated === "1", page });
  const filtered = Boolean(service || status || assignee || query.q?.trim() || query.open === "1" || query.overdue === "1" || query.escalated === "1");
  const totalPages = Math.max(Math.ceil(list.total / list.pageSize), 1);

  const params = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ service, status, assignee, q: query.q?.trim(), open: query.open === "1" ? "1" : undefined, overdue: query.overdue === "1" ? "1" : undefined, escalated: query.escalated === "1" ? "1" : undefined })) if (v) sp.set(k, v);
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
      cell: (row) => (
        <span className="inline-flex items-center gap-[var(--space-2)]">
          <Glyph icon={serviceIcon(row.service, row.kind)} className="text-ink-600" />
          <span>{`${pick(getServiceDef(row.service).label, locale)}, ${pick(SERVICES[row.service].kinds[row.kind]?.label, locale)}`}</span>
        </span>
      ),
    },
    { id: "summary", header: a("casesColSummary", locale), cell: (row) => row.summary ?? "" },
    {
      id: "status",
      header: a("casesColStatus", locale),
      cell: (row) => {
        const def = getStatusDef(row.service, row.kind, row.status);
        return (
          <span className="flex flex-wrap items-center gap-[var(--space-1)]">
            <StatusTag tone={def?.tone ?? "neutral"} label={def ? pick(def.label, locale) : row.status} />
            {row.overdue ? <FlagTag icon="overdue" label={a("cpcOverdue", locale)} /> : null}
            {row.escalated ? <FlagTag icon="escalated" label={a("cpcEscalatedTag", locale)} /> : null}
          </span>
        );
      },
    },
    { id: "assigned", header: a("casesColAssigned", locale), cell: (row) => row.assigneeName ?? <span className="text-ink-600">{a("casesUnassigned", locale)}</span> },
    { id: "updated", header: a("casesColUpdated", locale), cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
  ];

  const view = query.escalated === "1" ? "escalated" : query.overdue === "1" ? "overdue" : assignee === "me" ? "me" : assignee === "unassigned" ? "unassigned" : query.open === "1" ? "open" : "all";
  const viewHref = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ service, q: query.q?.trim(), ...extra })) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/admin/cases?${qs}` : "/admin/cases";
  };
  const views = [
    { id: "all", label: a("ckViewAll", locale), href: viewHref({}) },
    { id: "open", label: a("ckViewOpen", locale), href: viewHref({ open: "1" }) },
    { id: "me", label: a("ckViewMine", locale), href: viewHref({ assignee: "me", open: "1" }) },
    { id: "unassigned", label: a("ckViewUnassigned", locale), href: viewHref({ assignee: "unassigned", open: "1" }) },
    ...(services.includes("complaint")
      ? [
          { id: "overdue", label: a("ckViewOverdue", locale), href: viewHref({ overdue: "1", open: "1" }) },
          { id: "escalated", label: a("ckViewEscalated", locale), href: viewHref({ escalated: "1", open: "1" }) },
        ]
      : []),
  ];

  const canLog = services.includes("lost_found");

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="cases"
        title={a("casesTitle", locale)}
        description={a("casesIntro", locale)}
        actions={
          canLog ? (
            <>
              <Button href="/admin/cases/new/found" icon={<ConsoleIcon name="add" />}>
                {a("lfcInboxLogFound", locale)}
              </Button>
              <Button href="/admin/cases/new/lost" variant="secondary" icon={<ConsoleIcon name="add" />}>
                {a("lfcInboxLogLost", locale)}
              </Button>
            </>
          ) : null
        }
      />

      <Toolbar
        search={<SearchField label={a("casesFilterReference", locale)} submitLabel={a("ckSearch", locale)} defaultValue={query.q} hidden={{ ...(service ? { service } : {}), ...(status ? { status } : {}), ...(assignee ? { assignee } : {}), ...(query.open === "1" ? { open: "1" } : {}), ...(query.overdue === "1" ? { overdue: "1" } : {}), ...(query.escalated === "1" ? { escalated: "1" } : {}) }} />}
        filters={<FilterChips label={a("ckViewsLabel", locale)} options={views} current={view} />}
      />

      <form method="get" role="search" aria-label={a("ckFiltersLabel", locale)} className="console-filter-row flex flex-wrap items-end gap-[var(--space-3)]">
        {query.q?.trim() ? <input type="hidden" name="q" value={query.q.trim()} /> : null}
        {services.length > 1 ? (
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="cases-service" className="text-sm font-medium">
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
          <label htmlFor="cases-status" className="text-sm font-medium">
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
          <label htmlFor="cases-assignee" className="text-sm font-medium">
            {a("casesFilterAssignee", locale)}
          </label>
          <select id="cases-assignee" name="assignee" defaultValue={assignee ?? ""} className={field}>
            <option value="">{a("casesFilterAnyone", locale)}</option>
            <option value="me">{a("casesFilterMe", locale)}</option>
            <option value="unassigned">{a("casesFilterUnassigned", locale)}</option>
          </select>
        </div>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="open" value="1" defaultChecked={query.open === "1"} />
          {a("casesFilterOpenOnly", locale)}
        </label>
        {services.includes("complaint") ? (
          <>
            <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name="overdue" value="1" defaultChecked={query.overdue === "1"} />
              {a("cpcFilterOverdue", locale)}
            </label>
            <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name="escalated" value="1" defaultChecked={query.escalated === "1"} />
              {a("ckFilterEscalated", locale)}
            </label>
          </>
        ) : null}
        <Button type="submit" variant="secondary" icon={<ConsoleIcon name="filter" />}>
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
        filtered ? (
          <EmptyPanel icon="search" title={a("casesNone", locale)} action={<Button href="/admin/cases" variant="secondary">{a("casesFilterClear", locale)}</Button>}>
            {a("ckNoMatchBody", locale)}
          </EmptyPanel>
        ) : (
          <EmptyPanel icon="cases" title={a("ckNoneTitle", locale)}>
            {a("ckNoneBody", locale)}
          </EmptyPanel>
        )
      ) : (
        <DataTable columns={columns} rows={list.rows} getRowKey={(r) => r.id} caption={a("casesTitle", locale)} />
      )}
      <Pagination currentPage={list.page} totalPages={totalPages} buildHref={params} locale={locale} />
    </ConsolePage>
  );
}

function FlagTag({ icon, label }: { icon: "overdue" | "escalated"; label: string }) {
  return (
    <span className="inline-flex items-center gap-[var(--space-1)] rounded-pill border border-line-strong px-[var(--space-2)] py-[var(--space-1)] text-sm font-medium text-ink-900">
      <ConsoleIcon name={icon} size={14} />
      <span>{label}</span>
    </span>
  );
}
