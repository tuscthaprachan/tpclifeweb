import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ClipboardList, Clock, Contact, History, MessageSquare, UserCheck, Workflow } from "lucide-react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Heading, StatusTag, SummaryList, Tag, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { actingOrganisations, canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import { getComplaintFacts } from "@/lib/complaints/details";
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
import { ComplaintTargets } from "../complaints/Targets";
import { CopyReference } from "../CopyReference";
import { serviceIcon } from "../icons";
import { Glyph, SectionCard } from "../SectionCard";

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
  // A restricted complaint is a 404 to anyone not named on its category.
  try {
    await assertCaseAccess(db, row, actor);
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

  const facts = row.service === "complaint" ? await getComplaintFacts(db, id, actor) : null;
  const statusTag = <StatusTag tone={status?.tone ?? "neutral"} label={pick(statusLabel(row.service, row.kind, row.status), locale)} />;
  const Icon = serviceIcon(row.service, row.kind);

  const main = (
    <>
      {Panel ? <Panel caseId={id} reference={row.reference} service={row.service} kind={row.kind} status={row.status} locale={locale} organisationId={actor.organisationId} /> : null}

      <SectionCard id="case-messages" icon={MessageSquare} title={a("ckMessagesTitle", locale)} description={a("ckMessagesIntro", locale)}>
        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3}>{a("caseUpdateHeading", locale)}</Heading>
          <UpdateForm locale={locale} caseId={id} organisationId={actor.organisationId} />
        </div>
        <div className="flex flex-col gap-[var(--space-3)] border-t border-line pt-[var(--space-4)]">
          <Heading level={3}>{a("caseNoteHeading", locale)}</Heading>
          <NoteForm locale={locale} caseId={id} organisationId={actor.organisationId} />
        </div>
      </SectionCard>

      <SectionCard id="case-timeline" icon={History} title={a("caseTimelineTitle", locale)} description={a("caseTimelineNote", locale)}>
        <ol className="m-0 flex list-none flex-col gap-0 p-0">
          {[...events].reverse().map((event) => (
            <TimelineItem key={event.id} event={event} locale={locale} orgName={orgName} people={people} service={row.service} kind={row.kind} />
          ))}
        </ol>
      </SectionCard>
    </>
  );

  const aside = (
    <>
      <Card title={a("ckAsideReference", locale)} icon="cases" level={2}>
        <CopyReference reference={row.reference} copyLabel={a("ckCopyReference", locale)} copiedLabel={a("ckCopied", locale)} />
      </Card>

      <SectionCard id="case-actions" icon={Workflow} title={a("caseStatusHeading", locale)}>
        <p className="m-0 flex flex-wrap items-center gap-[var(--space-2)]">
          <span className="text-ink-600">{a("ckCurrentStatus", locale)}</span>
          {statusTag}
        </p>
        {row.service === "complaint" ? (
          <p className="m-0 text-ink-600">{a("cpcStatusUsePanel", locale)}</p>
        ) : row.service === "borrowing" ? (
          <p className="m-0 text-ink-600">{a("brStatusUsePanel", locale)}</p>
        ) : next.length > 0 ? (
          <>
            <p className="m-0 text-sm text-ink-600">{a("ckNextSteps", locale, { steps: next.map((n) => n.label).join(", ") })}</p>
            <StatusForm locale={locale} caseId={id} organisationId={actor.organisationId} from={row.status} options={next} />
          </>
        ) : (
          <StatusForm locale={locale} caseId={id} organisationId={actor.organisationId} from={row.status} options={next} />
        )}
      </SectionCard>

      <SectionCard id="case-assign" icon={UserCheck} title={a("caseAssignHeading", locale)}>
        <p className="m-0">
          <span className="text-ink-600">{a("caseRowAssigned", locale)}: </span>
          {row.assignedTo ? (people.get(row.assignedTo) ?? row.assignedTo) : a("casesUnassigned", locale)}
        </p>
        <AssignForm locale={locale} caseId={id} organisationId={actor.organisationId} current={row.assignedTo} assignees={assignees.map((p) => ({ value: p.id, label: p.name || p.email }))} />
      </SectionCard>

      {facts ? (
        <SectionCard id="case-deadlines" icon={Clock} title={a("ckDeadlines", locale)}>
          <ComplaintTargets facts={facts} status={row.status} locale={locale} now={new Date()} />
        </SectionCard>
      ) : null}

      <SectionCard id="case-contacts" icon={Contact} title={a("caseContactsTitle", locale)}>
        {row.piiDeletedAt ? (
          <p className="m-0 text-ink-600">{a("caseContactsDeleted", locale)}</p>
        ) : contacts.length === 0 ? (
          <p className="m-0 text-ink-600">{a("caseContactsNone", locale)}</p>
        ) : (
          <ContactDetails locale={locale} caseId={id} organisationId={actor.organisationId} count={contacts.length} />
        )}
      </SectionCard>

      <SectionCard id="case-summary" icon={ClipboardList} title={a("caseSummaryTitle", locale)}>
        <SummaryList
          rows={[
            { key: a("caseRowService", locale), value: pick(service.label, locale) },
            { key: a("caseRowType", locale), value: pick(SERVICES[row.service].kinds[row.kind]?.label, locale) },
            ...(row.summary ? [{ key: a("caseRowDetails", locale), value: row.summary }] : []),
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
      </SectionCard>
    </>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="cases"
        title={row.reference}
        status={
          <>
            {statusTag}
            <span className="inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600">
              <Glyph icon={Icon} size={16} />
              {`${pick(service.label, locale)}, ${pick(SERVICES[row.service].kinds[row.kind]?.label, locale)}`}
            </span>
          </>
        }
        description={row.summary ?? undefined}
        actions={
          <Button href="/admin/cases" variant="secondary" icon={<ConsoleIcon name="back" />}>
            {a("caseBack", locale)}
          </Button>
        }
      />
      {orgIds.length > 1 ? (
        <p className="m-0 text-ink-600">
          {a("caseActingFor", locale)}:{" "}
          {orgIds.map((oid, i) => (
            <span key={oid}>
              {i > 0 ? " | " : ""}
              {oid === actor.organisationId ? <strong>{orgName.get(oid)}</strong> : <Link href={`/admin/cases/${id}?as=${oid}`}>{orgName.get(oid)}</Link>}
            </span>
          ))}
        </p>
      ) : null}

      <div className="console-form-layout console-form-layout-aside">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">{main}</div>
        <aside aria-label={a("ckAsideLabel", locale)} className="flex min-w-0 flex-col gap-[var(--space-4)]">
          {aside}
        </aside>
      </div>
    </ConsolePage>
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
    <li className="border-b border-line py-[var(--space-3)] first:border-t">
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
