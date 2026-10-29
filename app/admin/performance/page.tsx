import { Building2, Clock, Inbox } from "lucide-react";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConsolePage, FilterChips, PageHeader, StatCard } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, Heading, SummaryList, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { SERVICES, getStatusDef } from "@/lib/cases/services";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { SectionCard } from "../cases/SectionCard";
import { HeadlineStats, PerformanceCards } from "./Figures";
import { PERFORMANCE_ROLES } from "@/lib/performance/access";
import { getOperations, type DeskRow, type OpenByStatus } from "@/lib/performance/operations";
import { PERIODS, parsePeriod } from "@/lib/performance/period";
import { buildPerformanceReport, type PerformanceReport } from "@/lib/performance/report";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("pfTitle");
}

const PERIOD_LABEL = { "30d": "perfPeriod30d", "12m": "perfPeriod12m", all: "perfPeriodAll" } as const;

function statusLabel(row: OpenByStatus, locale: Locale): string {
  const def = getStatusDef(row.service, row.kind, row.status);
  return def ? pick(def.label, locale) : row.status;
}

export default async function AdminPerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(PERFORMANCE_ROLES);
  const period = parsePeriod((await searchParams).period);
  const db = getDb();
  const now = new Date();

  const [operations, report] = await Promise.all([
    getOperations(db, staff.user.id, now),
    buildPerformanceReport(db, period, now).catch((error: unknown): PerformanceReport | null => {
      console.error("[performance] staff dashboard figures failed", error instanceof Error ? error.message : error);
      return null;
    }),
  ]);
  const n = (value: number) => formatNumber(value, locale);
  const c = operations.complaints;
  const deskName = (d: DeskRow) => (d.organisationId === null ? a("pfNoDesk", locale) : pick({ th: d.nameTh ?? "", en: d.nameEn ?? "" }, locale));

  const periodOptions = PERIODS.map((p) => ({ id: p, label: UI[PERIOD_LABEL[p]][locale], href: `/admin/performance?period=${p}` }));

  return (
    <ConsolePage width="content">
      <PageHeader
        icon="performance"
        title={a("pfTitle", locale)}
        description={a("pfIntro", locale)}
        actions={
          <Button href={localePath(locale, "/performance")} variant="secondary" icon={<ConsoleIcon name="viewLive" />}>
            {a("pfPublicLink", locale)}
          </Button>
        }
      />

      <section aria-labelledby="pf-figures" className="flex flex-col gap-[var(--space-4)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
          <div>
            <Heading level={2} id="pf-figures">
              {a("pfFiguresHeading", locale)}
            </Heading>
            <p className="m-0 mt-[var(--space-1)] text-ink-600">{a("pfFiguresIntro", locale)}</p>
          </div>
          <FilterChips label={UI.perfPeriodLabel[locale]} options={periodOptions} current={period} />
        </div>
        {report ? (
          <>
            <p className="m-0 text-sm text-ink-600">
              <Timestamp value={report.generatedAt} locale={locale} format="datetime" />
            </p>
            <HeadlineStats report={report} locale={locale} />
            <PerformanceCards report={report} locale={locale} />
          </>
        ) : (
          <p className="m-0 text-ink-900">{a("pfUnavailable", locale)}</p>
        )}
      </section>

      <section aria-labelledby="pf-ops" className="flex flex-col gap-[var(--space-4)]">
        <div>
          <Heading level={2} id="pf-ops">
            {a("pfOpsHeading", locale)}
          </Heading>
          <p className="m-0 mt-[var(--space-1)] text-ink-600">{a("pfOpsIntro", locale)}</p>
        </div>

        <div className="grid gap-[var(--space-3)] [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
          <StatCard icon="cases" label={a("pfComplaintsOpen", locale)} value={n(c.open)} />
          <StatCard icon="overdue" label={a("pfOverdueAny", locale)} value={n(c.overdue)} tone={c.overdue > 0 ? "attention" : "neutral"} hint={c.overdue > 0 ? a("pfOverdueIntro", locale) : undefined} />
          <StatCard icon="escalated" label={a("pfEscalated", locale)} value={n(c.escalated)} />
        </div>

        <SectionCard level={3} icon={Inbox} title={a("pfOpenHeading", locale)}>
          {operations.openByStatus.length === 0 ? (
            <p className="m-0 text-ink-600">{a("pfNoneOpen", locale)}</p>
          ) : (
            <DataTable
              caption={a("pfOpenCaption", locale)}
              columns={[
                { id: "service", header: a("pfColService", locale), cell: (r) => pick(SERVICES[r.service].label, locale) },
                { id: "type", header: a("pfColType", locale), cell: (r) => pick(SERVICES[r.service].kinds[r.kind]?.label ?? { th: r.kind, en: r.kind }, locale) },
                { id: "status", header: a("pfColStatus", locale), cell: (r) => statusLabel(r, locale) },
                { id: "n", header: a("pfColOpen", locale), align: "end", cell: (r) => n(r.n) },
              ]}
              rows={[...operations.openByStatus].sort((x, y) => x.service.localeCompare(y.service) || x.kind.localeCompare(y.kind) || x.status.localeCompare(y.status))}
              getRowKey={(r) => `${r.service}:${r.kind}:${r.status}`}
            />
          )}
        </SectionCard>

        <SectionCard level={3} icon={Clock} title={a("pfOverdueHeading", locale)} description={a("pfOverdueIntro", locale)}>
          <SummaryList
            rows={[
              { key: a("pfComplaintsOpen", locale), value: <strong>{n(c.open)}</strong> },
              { key: a("pfAckOverdue", locale), value: <Count value={n(c.acknowledgeOverdue)} note={a("pfAckOverdueDef", locale)} /> },
              { key: a("pfResolveOverdue", locale), value: <Count value={n(c.resolveOverdue)} note={a("pfResolveOverdueDef", locale)} /> },
              { key: a("pfOverdueAny", locale), value: <strong>{n(c.overdue)}</strong> },
              { key: a("pfEscalated", locale), value: <Count value={n(c.escalated)} note={a("pfEscalatedDef", locale)} /> },
            ]}
          />
        </SectionCard>

        <SectionCard level={3} icon={Building2} title={a("pfDesksHeading", locale)}>
          <DataTable
            caption={a("pfDesksCaption", locale)}
            columns={[
              { id: "desk", header: a("pfColDesk", locale), cell: deskName },
              { id: "held", header: a("pfColHeld", locale), align: "end", cell: (r) => n(r.held) },
              { id: "handled", header: a("pfColHandled", locale), align: "end", cell: (r) => n(r.lastHandled) },
            ]}
            rows={operations.desks}
            getRowKey={(r) => r.slug ?? "none"}
          />
          <p className="m-0 text-sm text-ink-600">{a("pfDesksNote", locale)}</p>
        </SectionCard>
      </section>
    </ConsolePage>
  );
}

function Count({ value, note }: { value: string; note: string }) {
  return (
    <>
      <strong>{value}</strong>
      <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{note}</p>
    </>
  );
}
