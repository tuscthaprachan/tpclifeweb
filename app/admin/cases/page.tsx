import Form from "next/form";
import Link from "next/link";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { SelectAllCheckbox } from "@/components/admin/content/BulkControls";
import { ContentTable, type ContentTableColumn } from "@/components/admin/content/ContentTable";
import { ConsolePage, EmptyPanel, FilterChips, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { Button, Details, NotificationBanner, Pagination, Select, StatusTag, TextInput, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { hasAnyRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { accessibleServices, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { parseCaseBulkReport, type CaseBulkReason } from "@/lib/cases/bulk";
import { listAssignees, listCases, type CaseListRow } from "@/lib/cases/engine";
import type { DueState } from "@/lib/cases/due";
import { canonicalViewQuery, inboxHref, inboxParams, nextCaseSort, parseInboxQuery, type CaseSortKey } from "@/lib/cases/inbox-query";
import { caseVisibleTo } from "@/lib/cases/restrictions";
import { allStatuses, getServiceDef, getStatusDef, SERVICES, type CaseService } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { listViews } from "@/lib/cases/views";
import { getDb } from "@/lib/db";
import { cases } from "@/lib/db/schema/cases";
import { and, inArray } from "drizzle-orm";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { bulkCasesAction, deleteViewAction, saveViewAction, updateViewAction } from "./inbox-actions";
import { Glyph } from "./SectionCard";
import { serviceIcon } from "./icons";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("casesTitle");
}

type Query = Record<string, string | string[] | undefined>;

const field = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900";

const REASON_KEYS = {
  forbidden: "ckReasonForbidden",
  not_found: "ckReasonNotFound",
  invalid_transition: "ckReasonInvalidTransition",
  stale: "ckReasonStale",
  pii_deleted: "ckReasonPiiDeleted",
  assignee: "ckReasonAssignee",
  use_actions: "ckReasonUseActions",
  invalid: "ckReasonInvalid",
  error: "ckReasonError",
} as const satisfies Record<CaseBulkReason, AdminKey>;

const VIEW_NOTICES: Record<string, { key: AdminKey; variant: "success" | "warning" }> = {
  viewSaved: { key: "ckSvSaved", variant: "success" },
  viewUpdated: { key: "ckSvUpdated", variant: "success" },
  viewDeleted: { key: "ckSvDeleted", variant: "success" },
  viewError_name: { key: "ckSvErrName", variant: "warning" },
  viewError_limit: { key: "ckSvErrLimit", variant: "warning" },
  viewError_notFound: { key: "ckSvErrNotFound", variant: "warning" },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CasesInboxPage({ searchParams }: { searchParams: Promise<Query> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const raw = await searchParams;

  const services = accessibleServices(staff.roles);
  const statuses = services.flatMap((s) => allStatuses(s)).filter((s, i, all) => all.findIndex((o) => o.key === s.key) === i);
  const serviceStatuses = (service: CaseService | undefined) => (service ? allStatuses(service) : statuses);
  const parsed = parseInboxQuery(raw, { services, statuses: statuses.map((s) => s.key) });
  const service = parsed.service as CaseService | undefined;
  const status = serviceStatuses(service).find((s) => s.key === parsed.status)?.key;
  const query = { ...parsed, service, status };
  const db = getDb();
  const actor = await staffActorFor(staff, services[0]!);
  const [list, assignees, views] = await Promise.all([
    listCases(db, actor, { service, status, assignee: query.assignee, q: query.q, openOnly: query.open, overdue: query.overdue, escalated: query.escalated, sort: query.sort, dir: query.dir, page: query.page }),
    listAssignees(db, services[0]!),
    listViews(db, staff.user.id),
  ]);
  const hasFilters = Boolean(service || status || query.assignee || query.q || query.open || query.overdue || query.escalated);
  const totalPages = Math.max(Math.ceil(list.total / list.pageSize), 1);
  const here = inboxParams({ ...query, page: 1 });
  const pageHref = (p: number) => inboxHref(query, { page: p });
  const sortHref = (key: CaseSortKey) => inboxHref(query, nextCaseSort(query, key));
  const canExport = hasAnyRole(staff.roles, ["officer", "admin"]);
  const exportHref = `/admin/cases/export${inboxParams({ ...query, page: 1 }) ? `?${inboxParams({ ...query, page: 1 })}` : ""}`;

  const report = parseCaseBulkReport({ bulk: raw.bulk, ok: raw.ok, fail: raw.fail });
  const failedIds = report?.failed.map((f) => f.id) ?? [];
  const failedRefs = failedIds.length
    ? new Map((await db.select({ id: cases.id, reference: cases.reference }).from(cases).where(and(inArray(cases.id, failedIds), inArray(cases.service, services), caseVisibleTo(staff.user.id)))).map((r) => [r.id, r.reference]))
    : new Map<string, string>();
  const bulkNotice = first(raw.bulk);
  const viewNotice = VIEW_NOTICES[first(raw.notice) ?? ""];

  const columns: ContentTableColumn<CaseListRow, CaseSortKey>[] = [
    {
      id: "select",
      header: a("ckBulkLabel", locale),
      headerHidden: true,
      cell: (row) => (
        <label className="inline-flex min-h-[var(--target-min)] items-center">
          <input type="checkbox" name="id" value={row.id} className="h-[1.25rem] w-[1.25rem] accent-[var(--colour-action)]" />
          <span className="visually-hidden">{a("ckSelectRow", locale, { reference: row.reference })}</span>
        </label>
      ),
    },
    {
      id: "reference",
      header: a("casesColReference", locale),
      sort: { key: "reference", href: sortHref("reference") },
      cell: (row) => (
        <Link href={`/admin/cases/${row.id}`} className="font-medium">
          {row.reference}
          <span className="visually-hidden"> {a("casesOpenCase", locale)}</span>
        </Link>
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
      sort: { key: "status", href: sortHref("status") },
      cell: (row) => {
        const def = getStatusDef(row.service, row.kind, row.status);
        return (
          <span className="flex flex-wrap items-center gap-[var(--space-1)]">
            <StatusTag tone={def?.tone ?? "neutral"} label={def ? pick(def.label, locale) : row.status} />
            {row.escalated ? <FlagTag icon="escalated" label={a("cpcEscalatedTag", locale)} /> : null}
          </span>
        );
      },
    },
    {
      id: "due",
      header: a("ckColDue", locale),
      sort: { key: "due", href: sortHref("due") },
      cell: (row) => <DueCell state={row.dueState} dueAt={row.dueAt} locale={locale} />,
    },
    { id: "assigned", header: a("casesColAssigned", locale), cell: (row) => row.assigneeName ?? <span className="text-ink-600">{a("casesUnassigned", locale)}</span> },
    { id: "received", header: a("ckColReceived", locale), sort: { key: "received", href: sortHref("received") }, cell: (row) => <Timestamp value={row.createdAt} locale={locale} format="date" /> },
    { id: "updated", header: a("casesColUpdated", locale), sort: { key: "updated", href: sortHref("updated") }, cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
  ];

  const viewHref = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ service, q: query.q, ...extra })) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/admin/cases?${qs}` : "/admin/cases";
  };
  const presetView = query.escalated ? "escalated" : query.overdue ? "overdue" : query.assignee === "me" ? "me" : query.assignee === "unassigned" ? "unassigned" : query.open ? "open" : "all";
  const comparable = canonicalViewQuery(inboxParams({ ...query, page: 1 }));
  const savedMatch = hasFilters || query.sort !== "updated" || query.dir !== "desc" ? views.find((v) => canonicalViewQuery(inboxParams(parseInboxQuery(Object.fromEntries(new URLSearchParams(v.query)), { services, statuses: statuses.map((s) => s.key) }))) === comparable) : undefined;
  const chips = [
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
    ...views.map((v) => ({ id: `view-${v.id}`, label: v.mine ? v.name : `${v.name} (${a("ckSvSharedBy", locale, { name: v.ownerName })})`, href: v.query ? `/admin/cases?${v.query}` : "/admin/cases" })),
  ];
  const current = savedMatch ? `view-${savedMatch.id}` : presetView;

  const canLog = services.includes("lost_found");
  const hiddenKeep: Record<string, string> = {
    ...(service ? { service } : {}),
    ...(status ? { status } : {}),
    ...(query.assignee ? { assignee: query.assignee } : {}),
    ...(query.open ? { open: "1" } : {}),
    ...(query.overdue ? { overdue: "1" } : {}),
    ...(query.escalated ? { escalated: "1" } : {}),
    ...(query.sort !== "updated" || query.dir !== "desc" ? { sort: query.sort, dir: query.dir } : {}),
  };
  const sortOptions = columns.filter((c) => c.sort).map((c) => ({ key: c.sort!.key, label: c.header }));

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

      {report ? (
        <NotificationBanner variant={report.failed.length === 0 ? "success" : "warning"} title={a(report.failed.length === 0 ? "ckBulkDoneTitle" : report.ok === 0 ? "ckBulkFailedTitle" : "ckBulkPartialTitle", locale)}>
          <p className="m-0">{a(report.action === "assign" ? "ckBulkSummaryAssign" : "ckBulkSummaryTransition", locale, { ok: report.ok, failed: report.failed.length })}</p>
          {report.failed.length > 0 ? (
            <ul className="m-0 mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] pl-[var(--space-5)]">
              {report.failed.map((f) => (
                <li key={f.id}>{a("ckBulkFailureItem", locale, { reference: failedRefs.get(f.id) ?? a("ckBulkUnknownCase", locale), reason: a(REASON_KEYS[f.reason], locale) })}</li>
              ))}
            </ul>
          ) : null}
        </NotificationBanner>
      ) : null}
      {bulkNotice === "none" ? (
        <NotificationBanner variant="warning" title={a("ckBulkNone", locale)}>
          {a("ckBulkNoneBody", locale)}
        </NotificationBanner>
      ) : null}
      {bulkNotice === "needAssignee" || bulkNotice === "needStatus" ? (
        <NotificationBanner variant="warning" title={a(bulkNotice === "needAssignee" ? "ckBulkChooseAssignee" : "ckBulkChooseStatus", locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {viewNotice ? (
        <NotificationBanner variant={viewNotice.variant} title={a(viewNotice.key, locale)}>
          {null}
        </NotificationBanner>
      ) : null}

      <Toolbar
        search={<SearchField label={a("casesFilterReference", locale)} submitLabel={a("ckSearch", locale)} defaultValue={query.q} hidden={hiddenKeep} />}
        filters={<FilterChips label={a("ckViewsLabel", locale)} options={chips} current={current} />}
        actions={
          canExport ? (
            <Button href={exportHref} variant="secondary" icon={<ConsoleIcon name="download" />} download>
              {a("ckExport", locale)}
              <span className="visually-hidden">. {a("ckExportNote", locale)}</span>
            </Button>
          ) : undefined
        }
      />

      <Form action="" role="search" aria-label={a("ckFiltersLabel", locale)} className="console-filter-row flex flex-wrap items-end gap-[var(--space-3)]">
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        {hiddenKeep.sort ? (
          <>
            <input type="hidden" name="sort" value={query.sort} />
            <input type="hidden" name="dir" value={query.dir} />
          </>
        ) : null}
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
          <select id="cases-assignee" name="assignee" defaultValue={query.assignee ?? ""} className={field}>
            <option value="">{a("casesFilterAnyone", locale)}</option>
            <option value="me">{a("casesFilterMe", locale)}</option>
            <option value="unassigned">{a("casesFilterUnassigned", locale)}</option>
          </select>
        </div>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="open" value="1" defaultChecked={query.open} />
          {a("casesFilterOpenOnly", locale)}
        </label>
        {services.includes("complaint") ? (
          <>
            <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name="overdue" value="1" defaultChecked={query.overdue} />
              {a("cpcFilterOverdue", locale)}
            </label>
            <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name="escalated" value="1" defaultChecked={query.escalated} />
              {a("ckFilterEscalated", locale)}
            </label>
          </>
        ) : null}
        <Button type="submit" variant="secondary" icon={<ConsoleIcon name="filter" />}>
          {a("casesFilterApply", locale)}
        </Button>
        {hasFilters ? (
          <Button href="/admin/cases" variant="quiet">
            {a("casesFilterClear", locale)}
          </Button>
        ) : null}
      </Form>

      <p className="m-0 text-ink-600" role="status">
        {list.total === 1 ? a("casesTotalOne", locale) : a("casesTotal", locale, { count: formatNumber(list.total, locale) })}
      </p>
      {list.rows.length === 0 ? (
        hasFilters ? (
          <EmptyPanel icon="search" title={a("casesNone", locale)} action={<Button href="/admin/cases" variant="secondary">{a("casesFilterClear", locale)}</Button>}>
            {a("ckNoMatchBody", locale)}
          </EmptyPanel>
        ) : (
          <EmptyPanel icon="cases" title={a("ckNoneTitle", locale)}>
            {a("ckNoneBody", locale)}
          </EmptyPanel>
        )
      ) : (
        <>
          <nav aria-label={a("ckSortMobile", locale)} className="sm:hidden">
            <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
              {sortOptions.map((option) => (
                <li key={option.key}>
                  <Link href={sortHref(option.key)} aria-current={query.sort === option.key ? "true" : undefined} className="console-chip">
                    {query.sort === option.key ? <ConsoleIcon name={query.dir === "asc" ? "moveUp" : "moveDown"} size={14} /> : null}
                    <span>{option.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form action={bulkCasesAction} className="flex flex-col gap-[var(--space-3)]">
            <input type="hidden" name="back" value={here} />
            <SelectAllCheckbox locale={locale} />
            <ContentTable columns={columns} rows={list.rows} getRowKey={(r) => r.id} caption={a("ckCaption", locale, { shown: list.rows.length, total: list.total })} sort={{ key: query.sort, dir: query.dir }} locale={locale} />
            <fieldset className="m-0 flex flex-col gap-[var(--space-3)] border border-line p-[var(--space-4)]">
              <legend className="px-[var(--space-1)] font-medium">{a("ckBulkLabel", locale)}</legend>
              <p className="m-0 text-sm text-ink-600">{a("ckBulkHint", locale)}</p>
              <div className="flex flex-wrap items-end gap-[var(--space-3)]">
                <Select
                  id="bulk-assignee"
                  name="assignee"
                  label={a("ckBulkAssignLabel", locale)}
                  defaultValue=""
                  options={[
                    { value: "", label: a("ckBulkAssignChoose", locale) },
                    { value: "me", label: a("casesFilterMe", locale) },
                    ...assignees.filter((p) => p.id !== staff.user.id).map((p) => ({ value: p.id, label: p.name || p.email })),
                    { value: "nobody", label: a("ckBulkAssignNobody", locale) },
                  ]}
                />
                <Button type="submit" name="intent" value="assign" variant="secondary" icon={<ConsoleIcon name="assign" />}>
                  {a("ckBulkAssignApply", locale)}
                </Button>
              </div>
              {services.includes("lost_found") ? (
                <div className="flex flex-wrap items-end gap-[var(--space-3)]">
                  <Select
                    id="bulk-status"
                    name="status"
                    label={a("ckBulkStatusLabel", locale)}
                    defaultValue=""
                    options={[{ value: "", label: a("ckBulkStatusChoose", locale) }, ...allStatuses("lost_found").map((s) => ({ value: s.key, label: pick(s.label, locale) }))]}
                  />
                  <Button type="submit" name="intent" value="transition" variant="secondary" icon={<ConsoleIcon name="check" />}>
                    {a("ckBulkStatusApply", locale)}
                  </Button>
                </div>
              ) : null}
            </fieldset>
          </form>
        </>
      )}
      <Pagination currentPage={list.page} totalPages={totalPages} buildHref={pageHref} locale={locale} />

      <Details summary={a("ckSvSaveTitle", locale)}>
        <form action={saveViewAction} className="flex flex-col gap-[var(--space-3)]">
          <input type="hidden" name="back" value={here} />
          <p className="m-0 text-ink-600">{a("ckSvSaveHint", locale)}</p>
          <TextInput id="view-name" name="name" label={a("ckSvName", locale)} maxLength={60} required className="max-w-[24rem]" />
          <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
            <input type="checkbox" name="shared" />
            {a("ckSvShared", locale)}
          </label>
          <div>
            <Button type="submit" variant="secondary" icon={<ConsoleIcon name="savedView" />}>
              {a("ckSvSave", locale)}
            </Button>
          </div>
        </form>
        {views.some((v) => v.mine) ? (
          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)] border-t border-line pt-[var(--space-4)]">
            <h2 className="m-0 text-lg font-semibold">{a("ckSvManageTitle", locale)}</h2>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
              {views
                .filter((v) => v.mine)
                .map((v) => (
                  <li key={v.id} className="flex flex-col gap-[var(--space-2)]">
                    <form action={updateViewAction} className="flex flex-wrap items-end gap-[var(--space-3)]">
                      <input type="hidden" name="back" value={here} />
                      <input type="hidden" name="viewId" value={v.id} />
                      <TextInput id={`view-name-${v.id}`} name="name" label={a("ckSvRenameLabel", locale, { name: v.name })} defaultValue={v.name} maxLength={60} required />
                      <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                        <input type="checkbox" name="shared" defaultChecked={v.shared} />
                        {a("ckSvShared", locale)}
                      </label>
                      <Button type="submit" variant="secondary">
                        {a("ckSvUpdate", locale)}
                      </Button>
                    </form>
                    <form action={deleteViewAction}>
                      <input type="hidden" name="back" value={here} />
                      <input type="hidden" name="viewId" value={v.id} />
                      <Button type="submit" variant="quiet" icon={<ConsoleIcon name="delete" />}>
                        {a("ckSvDelete", locale)}
                        <span className="visually-hidden">: {v.name}</span>
                      </Button>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </Details>
    </ConsolePage>
  );
}

function DueCell({ state, dueAt, locale }: { state: DueState | null; dueAt: Date | null; locale: Parameters<typeof a>[1] }) {
  if (!state || !dueAt) return <span className="text-ink-600">{a("ckDueNone", locale)}</span>;
  const icon = state === "overdue" ? "overdue" : state === "soon" ? "dueSoon" : "check";
  const label = a(state === "overdue" ? "ckDueOverdue" : state === "soon" ? "ckDueSoon" : "ckDueOnTime", locale);
  return (
    <span className="flex flex-col gap-[var(--space-1)]">
      <span className="inline-flex items-center gap-[var(--space-1)] font-medium text-ink-900">
        <ConsoleIcon name={icon} size={14} />
        <span>{label}</span>
      </span>
      <span className="text-sm text-ink-600">
        <Timestamp value={dueAt} locale={locale} format="date" />
      </span>
    </span>
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
