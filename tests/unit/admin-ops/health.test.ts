import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import {
  checkCronSecret,
  checkEmail,
  checkEncryption,
  checkStorage,
  countAppliedMigrations,
  CRON_JOBS,
  cronCheck,
  EXPECTED_MIGRATIONS,
  lateAfterHours,
  loadCronRuns,
  migrationCheck,
  runHealthChecks,
} from "@/lib/admin/health/checks";
import { recordCronRun, runRecordedCron } from "@/lib/admin/health/cron-run";
import { createTestDb } from "../db/harness";

const KEY = Buffer.alloc(32, 7).toString("base64");

let db: Awaited<ReturnType<typeof createTestDb>>["db"];

beforeAll(async () => {
  ({ db } = await createTestDb());
});

describe("migration check", () => {
  it("is current when the database matches the journal", async () => {
    const applied = await countAppliedMigrations(db);
    expect(applied).toBe(EXPECTED_MIGRATIONS);
    expect(migrationCheck(applied)).toMatchObject({ status: "ok", detail: "migrationsCurrent" });
  });

  it("is an error with the missing count when migrations are pending", () => {
    expect(migrationCheck(14, 17)).toEqual({ id: "migrations", status: "error", detail: "migrationsPending", values: { count: 3, applied: 14, expected: 17 } });
  });

  it("warns when the database is ahead and errors when it cannot be read", () => {
    expect(migrationCheck(18, 17).status).toBe("warning");
    expect(migrationCheck(null).status).toBe("error");
  });

  it("returns null when the migrations table does not exist", async () => {
    const empty = (await createTestDb()).db;
    await empty.execute(sql`drop schema drizzle cascade`);
    expect(await countAppliedMigrations(empty)).toBeNull();
  });
});

describe("configuration checks never expose values", () => {
  it("email", () => {
    expect(checkEmail({ SMTP_HOST: "localhost", EMAIL_FROM: "a@b.test" })).toMatchObject({ status: "ok", detail: "emailSending" });
    expect(checkEmail({ SMTP_HOST: "localhost", EMAIL_FROM: "no-domain" })).toMatchObject({ status: "warning", detail: "emailMissing" });
    expect(checkEmail({ SMTP_HOST: "localhost", EMAIL_FROM: "TryTPC <no-reply@mail.example.org>" })).toMatchObject({ status: "ok" });
    expect(checkEmail({ EMAIL_LOG_ONLY: "1" })).toMatchObject({ status: "warning", detail: "emailLogOnly" });
    expect(checkEmail({ SMTP_HOST: "localhost" })).toMatchObject({ status: "warning", detail: "emailMissing" });
  });

  it("cron secret, storage and encryption", () => {
    expect(checkCronSecret({ CRON_SECRET: "s" }).status).toBe("ok");
    expect(checkCronSecret({}).status).toBe("error");
    expect(checkStorage({ STORAGE_DIR: "/srv/files" }).status).toBe("ok");
    expect(checkStorage({}).status).toBe("warning");
    expect(checkEncryption({ PII_ENCRYPTION_KEY: KEY, NODE_ENV: "production" }).status).toBe("ok");
    expect(checkEncryption({ NODE_ENV: "production" }).status).toBe("error");
    expect(checkEncryption({ NODE_ENV: "development" }).status).toBe("warning");
    expect(checkEncryption({ PII_ENCRYPTION_KEY: "short", NODE_ENV: "production" }).status).toBe("error");
  });

  it("a report holds no secret value", async () => {
    const report = await runHealthChecks(db, { SMTP_HOST: "localhost", SMTP_PASSWORD: "SMTPSECRETVALUE", EMAIL_FROM: "from@x.test", CRON_SECRET: "CRONSECRETVALUE", PII_ENCRYPTION_KEY: KEY, STORAGE_DIR: "/srv/TOKENDIR" });
    const text = JSON.stringify(report);
    for (const secret of ["SMTPSECRETVALUE", "CRONSECRETVALUE", KEY, "TOKEN"]) expect(text).not.toContain(secret);
  });
});

describe("cron runs", () => {
  it("reads the schedule from vercel.json", () => {
    expect(CRON_JOBS.map((j) => j.name)).toEqual(expect.arrayContaining(["retention", "complaints", "borrowing"]));
    expect(lateAfterHours("23 0 * * *")).toBe(36);
    expect(lateAfterHours("*/15 * * * *")).toBe(3);
    expect(lateAfterHours("0 */6 * * *")).toBe(3);
  });

  it("is never run until a cron.run entry exists, then recent, then late", async () => {
    const job = CRON_JOBS.find((j) => j.name === "retention")!;
    const now = new Date();
    expect(cronCheck(job, (await loadCronRuns(db)).find((r) => r.name === "retention"), now).detail).toBe("cronNever");
    await recordCronRun(db, "retention", { purged: 3, failed: 0 });
    const run = (await loadCronRuns(db)).find((r) => r.name === "retention")!;
    expect(run.counts).toEqual({ purged: 3, failed: 0 });
    expect(cronCheck(job, run, now)).toMatchObject({ status: "ok", detail: "cronRecent" });
    expect(cronCheck(job, run, new Date(now.getTime() + 40 * 3_600_000))).toMatchObject({ status: "warning", detail: "cronLate" });
  });
});

describe("failed cron runs", () => {
  it("records a thrown job and shows it failing until the next success", async () => {
    const job = CRON_JOBS.find((j) => j.name === "complaints")!;
    const now = new Date();
    await recordCronRun(db, "complaints", { closed: 1 });
    await expect(runRecordedCron(db, "complaints", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    const failed = (await loadCronRuns(db)).find((r) => r.name === "complaints")!;
    expect(failed).toMatchObject({ failed: true, counts: { error: "boom" } });
    expect(cronCheck(job, failed, now)).toMatchObject({ status: "error", detail: "cronFailing" });

    await expect(runRecordedCron(db, "complaints", async () => ({ closed: 2 }))).resolves.toEqual({ closed: 2 });
    const ok = (await loadCronRuns(db)).find((r) => r.name === "complaints")!;
    expect(ok.failed).toBe(false);
    expect(cronCheck(job, ok, now).status).toBe("ok");
  });
});
