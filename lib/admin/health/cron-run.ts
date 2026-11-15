import { withAudit, type AuditExecutor } from "@/lib/db/audit";

/**
 * Records that a scheduled job ran, with its counts, as a `cron.run` audit
 * entry (no actor). Failing to record never fails the job.
 */
export async function recordCronRun(db: AuditExecutor, name: string, counts: object): Promise<void> {
  try {
    await withAudit(db, { actorUserId: null }, async (_tx, audit) => {
      await audit({ action: "cron.run", entityType: "cron", entityId: name, after: counts });
    });
  } catch (error) {
    console.error(`[cron] could not record the ${name} run`, error);
  }
}

const ERROR_LIMIT = 300;

/** Records that a scheduled job threw, so the health page shows it failing. Never fails the caller. */
export async function recordCronFailure(db: AuditExecutor, name: string, error: unknown): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, ERROR_LIMIT);
  try {
    await withAudit(db, { actorUserId: null }, async (_tx, audit) => {
      await audit({ action: "cron.fail", entityType: "cron", entityId: name, after: { error: message } });
    });
  } catch (recordError) {
    console.error(`[cron] could not record the ${name} failure`, recordError);
  }
}

/**
 * Runs a job and records the outcome: counts on success, the error on
 * failure (then rethrown for the caller to turn into a response).
 */
export async function runRecordedCron<T extends object>(db: AuditExecutor, name: string, job: () => Promise<T>): Promise<T> {
  let result: T;
  try {
    result = await job();
  } catch (error) {
    console.error(`[cron] ${name} failed`, error);
    await recordCronFailure(db, name, error);
    throw error;
  }
  await recordCronRun(db, name, result);
  return result;
}
