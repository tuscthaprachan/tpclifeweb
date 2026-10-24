import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading, StatusTag, SummaryList, Tag, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { actingOrganisations, canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { listContactSummaries } from "@/lib/cases/contacts";
import { listAssignees, staffTimeline, type StaffTimelineEntry } from "@/lib/cases/engine";
import { allowedTransitions, getServiceDef, getStatusDef, SERVICES, statusLabel } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { CaseError } from "@/lib/cases/types";
import { getDb } from "@/lib/db";
import { isUuid } from "@/lib/admin/content/form-state";
import { cases } from "@/lib/db/schema/cases";
import { organisations } from "@/lib/db/schema/organisations";
import { a, fmt, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { CASE_PANELS } from "../panels";
import { AssignForm, NoteForm, StatusForm, UpdateForm } from "../CaseForms";
import { ContactDetails } from "../ContactDetails";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("casesTitle", locale) };
}

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ as?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const [{ id }, { as }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const db = getDb();
  const [row] = await db.select().from(cases).where(eq(cases.id, id));
  if (!row || !canAccessService(staff.roles, row.service)) notFound();

  const orgIds = actingOrganisations(staff.roles, row.service);
  const preferred = Number(as) || null;
  let actor;
  try {
    actor = await staffActorFor(staff, row.service, preferred);
  } catch (error) {
    if (error instanceof CaseError) notFound();
    throw error;
  }

  const [orgs, events, contacts, assignees] = await Promise.all([
    db.select().from(organisations),
    staffTimeline(db, id, actor),
    listContactSummaries(db, id, actor),
    listAssignees(db, row.service),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const service = getServiceDef(row.service);
  const status = getStatusDef(row.service, row.kind, row.status);
  const next = allowedTransitions(row.service, row.kind, row.status).map((key) => ({ value: key, label: pick(statusLabel(row.service, row.kind, key), locale) }));
  const Panel = CASE_PANELS[row.service];
  const people = new Map(assignees.map((p) => [p.id, p.name || p.email]));

  return (
    <AdminPage width="content">
      <div>
        <a href="/admin/cases">{a("caseBack", locale)}</a>
        <Heading level={1} className="mt-[var(--space-2)]">
          {row.reference}
        </Heading>
        {orgIds.length > 1 ? (
          <p className="mt-[var(--space-2)] text-ink-600">
            {a("caseActingFor", locale)}:{" "}
            {orgIds.map((oid, i) => (
              <span key={oid}>
                {i > 0 ? " | " : ""}
                {oid === actor.organisationId ? <strong>{orgName.get(oid)}</strong> : <a href={`/admin/cases/${id}?as=${oid}`}>{orgName.get(oid)}</a>}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="case-summary">
        <Heading level={2} id="case-summary">
          {a("caseSummaryTitle", locale)}
        </Heading>
        <SummaryList
          rows={[
            { key: a("caseRowService", locale), value: pick(service.label, locale) },
            { key: a("caseRowType", locale), value: pick(SERVICES[row.service].kinds[row.kind]?.label, locale) },
            { key: a("caseRowStatus", locale), value: <StatusTag tone={status?.tone ?? "neutral"} label={pick(statusLabel(row.service, row.kind, row.status), locale)} /> },
            ...(row.summary ? [{ key: a("caseRowDetails", locale), value: row.summary }] : []),
            { key: a("caseRowAssigned", locale), value: row.assignedTo ? (people.get(row.assignedTo) ?? row.assignedTo) : a("casesUnassigned", locale) },
            { key: a("caseRowActedBy", locale), value: row.actingOrganisationId ? (orgName.get(row.actingOrganisationId) ?? "") : a("caseNone", locale) },
            ...(row.owningOrganisationId ? [{ key: a("caseRowDesk", locale), value: orgName.get(row.owningOrganisationId) ?? "" }] : []),
            { key: a("caseRowOpened", locale), value: <Timestamp value={row.createdAt} locale={locale} format="datetime" /> },
            { key: a("caseRowUpdated", locale), value: <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
            ...(row.closedAt ? [{ key: a("caseRowClosed", locale), value: <Timestamp value={row.closedAt} locale={locale} format="datetime" /> }] : []),
            ...(row.piiDeletedAt
              ? [{ key: a("caseRowPiiGone", locale), value: <Timestamp value={row.piiDeletedAt} locale={locale} format="date" /> }]
              : row.piiDeleteAfter
                ? [{ key: a("caseRowPiiDue", locale), value: <Timestamp value={row.piiDeleteAfter} locale={locale} format="date" /> }]
                : []),
          ]}
        />
      </section>

      <section aria-labelledby="case-contacts">
        <Heading level={2} id="case-contacts">
          {a("caseContactsTitle", locale)}
        </Heading>
        {row.piiDeletedAt ? (
          <p className="mt-[var(--space-2)] text-ink-600">{a("caseContactsDeleted", locale)}</p>
        ) : contacts.length === 0 ? (
          <p className="mt-[var(--space-2)] text-ink-600">{a("caseContactsNone", locale)}</p>
        ) : (
          <div className="mt-[var(--space-2)]">
            <ContactDetails locale={locale} caseId={id} organisationId={actor.organisationId} count={contacts.length} />
          </div>
        )}
      </section>

      {Panel ? <Panel caseId={id} reference={row.reference} service={row.service} kind={row.kind} status={row.status} locale={locale} organisationId={actor.organisationId} /> : null}

      <section aria-labelledby="case-actions" className="flex flex-col gap-[var(--space-6)]">
        <Heading level={2} id="case-actions">
          {a("caseActionsTitle", locale)}
        </Heading>
        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3}>{a("caseStatusHeading", locale)}</Heading>
          <StatusForm locale={locale} caseId={id} organisationId={actor.organisationId} from={row.status} options={next} />
        </div>
        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3}>{a("caseUpdateHeading", locale)}</Heading>
          <UpdateForm locale={locale} caseId={id} organisationId={actor.organisationId} />
        </div>
        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3}>{a("caseNoteHeading", locale)}</Heading>
          <NoteForm locale={locale} caseId={id} organisationId={actor.organisationId} />
        </div>
        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3}>{a("caseAssignHeading", locale)}</Heading>
          <AssignForm
            locale={locale}
            caseId={id}
            organisationId={actor.organisationId}
            current={row.assignedTo}
            assignees={assignees.map((p) => ({ value: p.id, label: p.name || p.email }))}
          />
        </div>
      </section>

      <section aria-labelledby="case-timeline">
        <Heading level={2} id="case-timeline">
          {a("caseTimelineTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("caseTimelineNote", locale)}</p>
        <ol className="m-0 mt-[var(--space-3)] flex list-none flex-col gap-[var(--space-3)] p-0">
          {[...events].reverse().map((event) => (
            <TimelineItem key={event.id} event={event} locale={locale} orgName={orgName} people={people} service={row.service} kind={row.kind} />
          ))}
        </ol>
      </section>
    </AdminPage>
  );
}

function TimelineItem({
  event,
  locale,
  orgName,
  people,
  service,
  kind,
}: {
  event: StaffTimelineEntry;
  locale: Locale;
  orgName: Map<number, string>;
  people: Map<string, string>;
  service: Parameters<typeof statusLabel>[0];
  kind: string;
}) {
  const isPublic = event.visibility === "public";
  const title =
    event.type === "status_changed"
      ? fmt(a("caseStatusMoved", locale), {
          from: event.fromStatus ? pick(statusLabel(service, kind, event.fromStatus), locale) : "",
          to: event.toStatus ? pick(statusLabel(service, kind, event.toStatus), locale) : "",
        })
      : event.type === "assigned"
        ? (event.metadata as { to?: string | null } | null)?.to
          ? a("caseAssignedTo", locale, { name: people.get(String((event.metadata as { to: string }).to)) ?? "" })
          : a("caseUnassignedEvent", locale)
        : a(`caseEvent_${event.type}` as AdminKey, locale);
  const who = event.actorUserId ? a("caseBy", locale, { name: event.actorName ?? "" }) : event.type === "created" ? a("caseByPerson", locale) : a("caseBySystem", locale);
  const org = event.actingOrganisationId ? orgName.get(event.actingOrganisationId) : null;
  const message = event.body ?? (event.bodyTh || event.bodyEn ? [event.bodyTh, event.bodyEn].filter(Boolean).join("\n") : null);

  return (
    <li className={`rounded-control border-l-4 px-[var(--space-3)] py-[var(--space-2)] ${isPublic ? "border-action bg-surface-alt" : "border-dashed border-line-strong"}`}>
      <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <strong>{title}</strong>
        <Tag tone={isPublic ? "governance" : "neutral"}>{a(isPublic ? "caseTagPublic" : "caseTagInternal", locale)}</Tag>
      </div>
      <p className="m-0 text-sm text-ink-600">
        <Timestamp value={event.createdAt} locale={locale} format="datetime" /> {who}
        {org ? `, ${org}` : ""}
      </p>
      {message ? <p className="m-0 mt-[var(--space-1)] whitespace-pre-line">{message}</p> : null}
    </li>
  );
}
