import Form from "next/form";
import { AuditEntries } from "@/components/admin/audit/AuditEntries";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, EmptyPanel, PageHeader } from "@/components/admin/ui";
import { Button, Pagination } from "@/components/ui";
import { AUDIT_SYSTEM_ACTOR, auditFilterParams, hasAuditFilters, listAuditActors, listAuditEntityTypes, listAuditEntries, parseAuditFilters } from "@/lib/admin/audit/query";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { formatNumber } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("opAuditTitle");
}

const FIELD = "min-h-[var(--target-min)] w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="m-0 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff("admin");
  const filters = parseAuditFilters(await searchParams);
  const db = getDb();
  const [result, actors, entityTypes] = await Promise.all([listAuditEntries(db, filters, staff.user.id), listAuditActors(db), listAuditEntityTypes(db)]);

  const filtered = hasAuditFilters(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const href = (page: number) => {
    const sp = auditFilterParams(filters);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  };
  const exportHref = `/admin/audit/export${auditFilterParams(filters).size > 0 ? `?${auditFilterParams(filters).toString()}` : ""}`;

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="audit"
        title={a("opAuditTitle", locale)}
        description={a("opAuditIntro", locale)}
        actions={
          <Button href={exportHref} variant="secondary" icon={<ConsoleIcon name="save" />} download>
            {a("opAuditExport", locale)}
          </Button>
        }
      />

      <Form action="" role="search" aria-label={a("opFiltersLabel", locale)} className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4">
        <Field id="audit-actor" label={a("opFilterActor", locale)}>
          <select id="audit-actor" name="actor" defaultValue={filters.actor ?? ""} className={FIELD}>
            <option value="">{a("opFilterAnyActor", locale)}</option>
            <option value={AUDIT_SYSTEM_ACTOR}>{a("opActorSystem", locale)}</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name || actor.email}
              </option>
            ))}
          </select>
        </Field>
        <Field id="audit-action" label={a("opFilterAction", locale)} hint={a("opFilterActionHint", locale)}>
          <input id="audit-action" name="action" type="text" defaultValue={filters.action} autoComplete="off" spellCheck={false} aria-describedby="audit-action-hint" className={FIELD} />
        </Field>
        <Field id="audit-entity-type" label={a("opFilterEntityType", locale)}>
          <select id="audit-entity-type" name="entityType" defaultValue={filters.entityType ?? ""} className={FIELD}>
            <option value="">{a("opFilterAnyType", locale)}</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field id="audit-entity-id" label={a("opFilterEntityId", locale)} hint={a("opFilterEntityIdHint", locale)}>
          <input id="audit-entity-id" name="entityId" type="text" defaultValue={filters.entityId} autoComplete="off" spellCheck={false} aria-describedby="audit-entity-id-hint" className={FIELD} />
        </Field>
        <Field id="audit-from" label={a("opFilterFrom", locale)}>
          <input id="audit-from" name="from" type="date" defaultValue={filters.from} className={FIELD} />
        </Field>
        <Field id="audit-to" label={a("opFilterTo", locale)}>
          <input id="audit-to" name="to" type="date" defaultValue={filters.to} className={FIELD} />
        </Field>
        <Field id="audit-q" label={a("opFilterText", locale)} hint={a("opFilterTextHint", locale)}>
          <input id="audit-q" name="q" type="search" defaultValue={filters.q} autoComplete="off" spellCheck={false} aria-describedby="audit-q-hint" className={FIELD} />
        </Field>
        <div className="flex flex-wrap items-end gap-[var(--space-2)]">
          <Button type="submit" variant="secondary" icon={<ConsoleIcon name="filter" />}>
            {a("opFilterApply", locale)}
          </Button>
          {filtered ? (
            <Button href="/admin/audit" variant="quiet">
              {a("opFilterClear", locale)}
            </Button>
          ) : null}
        </div>
      </Form>

      <p className="m-0 text-ink-600" role="status">
        {result.total === 1 ? a("opResultsOne", locale) : a("opResultsMany", locale, { count: formatNumber(result.total, locale) })}
      </p>

      {result.rows.length === 0 ? (
        <EmptyPanel icon="audit" title={a(filtered ? "opNoMatchTitle" : "opNoneTitle", locale)} action={filtered ? <Button href="/admin/audit" variant="secondary">{a("opFilterClear", locale)}</Button> : undefined}>
          {a(filtered ? "opNoMatchBody" : "opNoneBody", locale)}
        </EmptyPanel>
      ) : (
        <Card padded={false}>
          <AuditEntries entries={result.rows} locale={locale} showChanges />
        </Card>
      )}

      <Pagination currentPage={result.page} totalPages={totalPages} buildHref={href} locale={locale} />
    </ConsolePage>
  );
}
