import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { StatusTag, SummaryList, Timestamp, type StatusTone } from "@/components/ui";
import { CRON_JOBS, runHealthChecks, type HealthCheck, type HealthStatus } from "@/lib/admin/health/checks";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { formatNumber } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("opHealthTitle");
}

const TONE: Record<HealthStatus, StatusTone> = { ok: "success", warning: "warning", error: "error" };
const STATUS_LABEL: Record<HealthStatus, AdminKey> = { ok: "opHealthOk", warning: "opHealthWarning", error: "opHealthError" };

const NAME: Record<string, AdminKey> = {
  email: "opHealthNameEmail",
  cronSecret: "opHealthNameCronSecret",
  storage: "opHealthNameStorage",
  encryption: "opHealthNameEncryption",
  migrations: "opHealthNameMigrations",
};

const DETAIL: Record<string, AdminKey> = {
  emailSending: "opHealthEmailSending",
  emailLogOnly: "opHealthEmailLogOnly",
  emailMissing: "opHealthEmailMissing",
  cronSecretSet: "opHealthCronSecretSet",
  cronSecretMissing: "opHealthCronSecretMissing",
  storageSet: "opHealthStorageSet",
  storageMissing: "opHealthStorageMissing",
  encryptionSet: "opHealthEncryptionSet",
  encryptionMissing: "opHealthEncryptionMissing",
  encryptionInvalid: "opHealthEncryptionInvalid",
  migrationsCurrent: "opHealthMigrationsCurrent",
  migrationsPending: "opHealthMigrationsPending",
  migrationsAhead: "opHealthMigrationsAhead",
  migrationsUnknown: "opHealthMigrationsUnknown",
  cronRecent: "opHealthCronRecent",
  cronLate: "opHealthCronLate",
  cronNever: "opHealthCronNever",
  cronFailing: "opHealthCronFailing",
};

export default async function HealthPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff("admin");
  const { checks, runs } = await runHealthChecks(getDb());

  const config = checks.filter((c) => !c.id.startsWith("cron:"));
  const crons = checks.filter((c) => c.id.startsWith("cron:"));
  const attention = checks.filter((c) => c.status !== "ok").length;
  const tag = (check: HealthCheck) => <StatusTag tone={TONE[check.status]} label={a(STATUS_LABEL[check.status], locale)} />;
  const detail = (check: HealthCheck) => a(DETAIL[check.detail]!, locale, Object.fromEntries(Object.entries(check.values ?? {}).map(([k, v]) => [k, typeof v === "number" ? formatNumber(v, locale) : v])));

  return (
    <ConsolePage width="content">
      <PageHeader
        icon="health"
        title={a("opHealthTitle", locale)}
        description={attention === 0 ? a("opHealthAllOk", locale) : attention === 1 ? a("opHealthOneAttention", locale) : a("opHealthManyAttention", locale, { count: formatNumber(attention, locale) })}
      />

      <Card title={a("opHealthConfigHeading", locale)} icon="siteSettings" description={a("opHealthConfigIntro", locale)}>
        <SummaryList
          rows={config.map((check) => ({
            key: a(NAME[check.id]!, locale),
            value: (
              <span className="flex flex-col items-start gap-[var(--space-1)]">
                {tag(check)}
                <span>{detail(check)}</span>
              </span>
            ),
          }))}
        />
      </Card>

      <Card title={a("opHealthCronHeading", locale)} icon="overdue" description={a("opHealthCronIntro", locale)}>
        <SummaryList
          rows={crons.map((check) => {
            const job = CRON_JOBS.find((j) => `cron:${j.name}` === check.id)!;
            const run = runs.find((r) => r.name === job.name);
            const counts = Object.entries(run?.counts ?? {}).filter(([, v]) => typeof v === "number") as [string, number][];
            return {
              key: <code>{job.path}</code>,
              value: (
                <span className="flex flex-col items-start gap-[var(--space-1)]">
                  {tag(check)}
                  <span>{detail(check)}</span>
                  {run?.at ? (
                    <span className="text-sm text-ink-600">
                      {a("opHealthLastRun", locale)}: <Timestamp value={run.at} locale={locale} format="datetime" />
                    </span>
                  ) : null}
                  {counts.length > 0 ? (
                    <span className="text-sm text-ink-600">
                      {counts.map(([k, v]) => `${k}: ${formatNumber(v, locale)}`).join(", ")}
                    </span>
                  ) : null}
                </span>
              ),
            };
          })}
        />
      </Card>
    </ConsolePage>
  );
}
