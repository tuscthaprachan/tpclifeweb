/**
 * System health for /admin/health. Each check reports a status and a short
 * reason, never a value: only whether a setting is present, whether the
 * migrations match the code, and when each scheduled job last ran. The
 * environment is a parameter so every branch is testable.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import vercel from "@/vercel.json";
import journal from "@/lib/db/migrations/meta/_journal.json";
import { isPiiAvailable } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { auditLog } from "@/lib/db/schema/audit-log";

export type HealthStatus = "ok" | "warning" | "error";

export type HealthCheckId = "email" | "cronSecret" | "storage" | "encryption" | "migrations" | `cron:${string}`;

export interface HealthCheck {
  id: HealthCheckId;
  status: HealthStatus;
  /** Message key suffix and values; resolved to text in the page. */
  detail: string;
  values?: Record<string, string | number>;
}

type Env = Record<string, string | undefined>;

const set = (env: Env, name: string) => Boolean(env[name]?.trim());

export function checkEmail(env: Env): HealthCheck {
  if (set(env, "RESEND_API_KEY") && set(env, "EMAIL_FROM")) return { id: "email", status: env.EMAIL_LOG_ONLY === "1" ? "warning" : "ok", detail: env.EMAIL_LOG_ONLY === "1" ? "emailLogOnly" : "emailSending" };
  if (env.EMAIL_LOG_ONLY === "1") return { id: "email", status: "warning", detail: "emailLogOnly" };
  return { id: "email", status: "warning", detail: "emailMissing" };
}

export function checkCronSecret(env: Env): HealthCheck {
  return set(env, "CRON_SECRET") ? { id: "cronSecret", status: "ok", detail: "cronSecretSet" } : { id: "cronSecret", status: "error", detail: "cronSecretMissing" };
}

export function checkStorage(env: Env): HealthCheck {
  return set(env, "BLOB_READ_WRITE_TOKEN") || set(env, "BLOB_STORE_ID") ? { id: "storage", status: "ok", detail: "storageSet" } : { id: "storage", status: "warning", detail: "storageMissing" };
}

export function checkEncryption(env: Env): HealthCheck {
  if (!set(env, "PII_ENCRYPTION_KEY")) return { id: "encryption", status: env.NODE_ENV === "production" ? "error" : "warning", detail: "encryptionMissing" };
  return isPiiAvailable(env) ? { id: "encryption", status: "ok", detail: "encryptionSet" } : { id: "encryption", status: "error", detail: "encryptionInvalid" };
}

/** How many migrations the code expects. */
export const EXPECTED_MIGRATIONS = journal.entries.length;

/** Compares what the database has applied with what the code ships. Pure. */
export function migrationCheck(applied: number | null, expected: number = EXPECTED_MIGRATIONS): HealthCheck {
  if (applied === null) return { id: "migrations", status: "error", detail: "migrationsUnknown" };
  if (applied < expected) return { id: "migrations", status: "error", detail: "migrationsPending", values: { count: expected - applied, applied, expected } };
  if (applied > expected) return { id: "migrations", status: "warning", detail: "migrationsAhead", values: { applied, expected } };
  return { id: "migrations", status: "ok", detail: "migrationsCurrent", values: { applied, expected } };
}

/** The number of migrations the database records, or null when the table cannot be read. */
export async function countAppliedMigrations(db: AuditExecutor): Promise<number | null> {
  try {
    const result = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as { n: number }[];
    return rows[0] ? Number(rows[0].n) : null;
  } catch {
    return null;
  }
}

export interface CronSchedule {
  name: string;
  path: string;
  /** How long after a run it counts as late. */
  lateAfterHours: number;
}

/** Hours after which a job counts as late: three for a job that runs through the day, 36 for a daily one. */
export function lateAfterHours(schedule: string): number {
  const hour = schedule.trim().split(/\s+/)[1] ?? "";
  return hour === "*" || hour.includes("/") || hour.includes(",") ? 3 : 36;
}

/** The jobs in vercel.json. A job records its runs under the last segment of its path (`/api/cron/retention` is `retention`). */
export const CRON_JOBS: readonly CronSchedule[] = vercel.crons.map((c) => ({
  name: c.path.split("/").filter(Boolean).pop() ?? c.path,
  path: c.path,
  lateAfterHours: lateAfterHours(c.schedule),
}));

export interface CronRun {
  name: string;
  at: Date | null;
  counts: Record<string, unknown> | null;
  /** The latest entry was a failure, not a run. */
  failed: boolean;
}

/** The latest `cron.run` or `cron.fail` entry for each job. */
export async function loadCronRuns(db: AuditExecutor): Promise<CronRun[]> {
  return Promise.all(
    CRON_JOBS.map(async (job): Promise<CronRun> => {
      const [row] = await db
        .select({ at: auditLog.occurredAt, after: auditLog.after, action: auditLog.action })
        .from(auditLog)
        .where(and(inArray(auditLog.action, ["cron.run", "cron.fail"]), eq(auditLog.entityType, "cron"), eq(auditLog.entityId, job.name)))
        .orderBy(desc(auditLog.occurredAt))
        .limit(1);
      const counts = row?.after && typeof row.after === "object" && !Array.isArray(row.after) ? (row.after as Record<string, unknown>) : null;
      return { name: job.name, at: row?.at ?? null, counts, failed: row?.action === "cron.fail" };
    }),
  );
}

export function cronCheck(job: CronSchedule, run: CronRun | undefined, now: Date): HealthCheck {
  const id = `cron:${job.name}` as const;
  if (!run?.at) return { id, status: "warning", detail: "cronNever" };
  if (run.failed) return { id, status: "error", detail: "cronFailing" };
  const hours = (now.getTime() - run.at.getTime()) / 3_600_000;
  return hours > job.lateAfterHours ? { id, status: "warning", detail: "cronLate" } : { id, status: "ok", detail: "cronRecent" };
}

export interface HealthReport {
  checks: HealthCheck[];
  runs: CronRun[];
}

export async function runHealthChecks(db: AuditExecutor, env: Env = process.env, now = new Date()): Promise<HealthReport> {
  const [applied, runs] = await Promise.all([countAppliedMigrations(db), loadCronRuns(db)]);
  return {
    checks: [
      checkEmail(env),
      checkCronSecret(env),
      checkStorage(env),
      checkEncryption(env),
      migrationCheck(applied),
      ...CRON_JOBS.map((job) => cronCheck(job, runs.find((r) => r.name === job.name), now)),
    ],
    runs,
  };
}
