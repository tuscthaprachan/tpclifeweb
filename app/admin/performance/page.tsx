import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PerformanceFigures } from "@/components/domain/performance/PerformanceFigures";
import { PeriodLinks } from "@/components/domain/performance/PeriodLinks";
import { DataTable, Heading, Stack, SummaryList, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { SERVICES, getStatusDef } from "@/lib/cases/services";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { PERFORMANCE_ROLES } from "@/lib/performance/access";
import { getOperations, type DeskRow, type OpenByStatus } from "@/lib/performance/operations";
import { parsePeriod } from "@/lib/performance/period";
import { buildPerformanceReport, type PerformanceReport } from "@/lib/performance/report";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("pfTitle");
}

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

  return (
    <AdminPage width="content">
      <div>
        <a href="/admin">{a("homeLink", locale)}</a>
        <Heading level={1} className="mt-[var(--space-2)]">
          {a("pfTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("pfIntro", locale)}</p>
        <p className="mt-[var(--space-2)]">
          <a href={localePath(locale, "/performance")}>{a("pfPublicLink", locale)}</a>
        </p>
      </div>

      <Stack space={6} as="section">
        <div>
          <Heading level={2}>{a("pfOpsHeading", locale)}</Heading>
          <p className="mt-[var(--space-2)] text-ink-600">{a("pfOpsIntro", locale)}</p>
        </div>

        <Stack space={3}>
          <Heading level={3}>{a("pfOpenHeading", locale)}</Heading>
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
        </Stack>

        <Stack space={3}>
          <Heading level={3}>{a("pfOverdueHeading", locale)}</Heading>
          <p className="m-0 text-ink-600">{a("pfOverdueIntro", locale)}</p>
          <SummaryList
            rows={[
              { key: a("pfComplaintsOpen", locale), value: <strong>{n(c.open)}</strong> },
              { key: a("pfAckOverdue", locale), value: <Count value={n(c.acknowledgeOverdue)} note={a("pfAckOverdueDef", locale)} /> },
              { key: a("pfResolveOverdue", locale), value: <Count value={n(c.resolveOverdue)} note={a("pfResolveOverdueDef", locale)} /> },
              { key: a("pfOverdueAny", locale), value: <strong>{n(c.overdue)}</strong> },
              { key: a("pfEscalated", locale), value: <Count value={n(c.escalated)} note={a("pfEscalatedDef", locale)} /> },
            ]}
          />
        </Stack>

        <Stack space={3}>
          <Heading level={3}>{a("pfDesksHeading", locale)}</Heading>
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
        </Stack>
      </Stack>

      <Stack space={6} as="section">
        <div>
          <Heading level={2}>{a("pfFiguresHeading", locale)}</Heading>
          <p className="mt-[var(--space-2)] text-ink-600">{a("pfFiguresIntro", locale)}</p>
        </div>
        <PeriodLinks locale={locale} current={period} basePath="/admin/performance" />
        {report ? (
          <>
            <p className="m-0 text-sm text-ink-600">
              <Timestamp value={report.generatedAt} locale={locale} format="datetime" />
            </p>
            <PerformanceFigures report={report} locale={locale} headingLevel={3} />
          </>
        ) : (
          <p className="m-0 text-ink-900">{a("pfUnavailable", locale)}</p>
        )}
      </Stack>
    </AdminPage>
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
