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
