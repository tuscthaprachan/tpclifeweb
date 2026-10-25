/** Journey completion, the staff operational counts, and the whole report. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { journeyMetrics } from "@/lib/db/schema";
import { acknowledgeComplaint } from "@/lib/complaints/workflow";
import { journeyMeasures, JOURNEY_SETTLE_MS, recordJourneyFinish, recordJourneyStart } from "@/lib/performance/journeys";
import { getOperations } from "@/lib/performance/operations";
import { rangeFor } from "@/lib/performance/period";
import { buildPerformanceReport } from "@/lib/performance/report";
import { setupComplaints, NOW, type Ctx } from "../complaints/helpers";

// Each suite builds a migrated database, which is slow on a busy runner.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const MIN = 60_000;
const DAY = 86_400_000;

describe("journey completion", () => {
  let t: Ctx;
  const now = new Date("2026-06-15T05:00:00Z");
  const kind = (rows: Awaited<ReturnType<typeof journeyMeasures>>, k: string) => rows.find((r) => r.kind === k)!;
  beforeAll(async () => {
    t = await setupComplaints();
    // Complaints: eight started and settled, five sent.
    for (let i = 0; i < 8; i++) {
      const id = crypto.randomUUID();
      await recordJourneyStart(t.db, id, "complaint", new Date(now.getTime() - 3 * DAY));
      if (i < 5) await recordJourneyFinish(t.db, id, new Date(now.getTime() - 3 * DAY + 10 * MIN));
    }
    // Two more still open: started an hour ago, neither sent nor given up.
    for (let i = 0; i < 2; i++) await recordJourneyStart(t.db, crypto.randomUUID(), "complaint", new Date(now.getTime() - 60 * MIN));
    // Lost: three started, below the rule.
    for (let i = 0; i < 3; i++) await recordJourneyStart(t.db, crypto.randomUUID(), "lost", new Date(now.getTime() - DAY));
  });

  it("completion rate is sent over settled; a journey still open counts as started only", async () => {
    const rows = await journeyMeasures(t.db, rangeFor("all", now), now);
    expect(kind(rows, "complaint").started).toMatchObject({ suppressed: false, value: 10 });
    expect(kind(rows, "complaint").completionRate).toEqual({ suppressed: false, n: 8, value: 63 });
    expect(JOURNEY_SETTLE_MS).toBe(2 * 60 * MIN);
  });

  it("hides a journey kind with fewer than five starts", async () => {
    const rows = await journeyMeasures(t.db, rangeFor("all", now), now);
    expect(kind(rows, "lost")).toMatchObject({ started: { suppressed: true }, completionRate: { suppressed: true } });
    expect(kind(rows, "claim").started).toEqual({ suppressed: true });
  });

  it("finishing twice keeps the first time, and an unknown id changes nothing", async () => {
    const id = crypto.randomUUID();
    await recordJourneyStart(t.db, id, "found", now);
    await recordJourneyFinish(t.db, id, new Date(now.getTime() + MIN));
    await recordJourneyFinish(t.db, id, new Date(now.getTime() + 9 * MIN));
    await recordJourneyFinish(t.db, crypto.randomUUID(), now);
    const [row] = await t.db.select().from(journeyMetrics).where(eq(journeyMetrics.id, id));
    expect(row!.finishedAt!.getTime()).toBe(now.getTime() + MIN);
  });

  it("the table holds nothing but the kind and two times", () => {
    expect(Object.keys(journeyMetrics).filter((k) => !k.startsWith("_") && k !== "enableRLS").sort()).toEqual(["finishedAt", "id", "kind", "startedAt"]);
  });
});

describe("operations", () => {
  it("counts open cases by status, overdue and escalated complaints, and cases by desk", async () => {
    const t = await setupComplaints();
    const open = await t.file();
    const acked = await t.file();
    await acknowledgeComplaint(t.db, acked.caseId, {}, t.handler, { now: NOW });
    await t.file({ key: "harassment" });

    const later = new Date(NOW.getTime() + 20 * DAY);
    // The named handler may see the restricted complaint; an administrator may not.
    const forAdmin = await getOperations(t.db, t.admin.userId, later);
    const forNamed = await getOperations(t.db, t.named.userId, later);
    const sum = (ops: typeof forAdmin, status: string) => ops.openByStatus.filter((r) => r.status === status).reduce((s, r) => s + r.n, 0);
    expect(sum(forAdmin, "received")).toBe(1);
    expect(sum(forAdmin, "acknowledged")).toBe(1);
    expect(forAdmin.complaints.open).toBe(2);
    expect(forAdmin.complaints.resolveOverdue).toBe(2);
    expect(forAdmin.complaints.acknowledgeOverdue).toBe(1);
    expect(forAdmin.complaints.overdue).toBe(2);
    expect(sum(forNamed, "received")).toBe(2);
    expect(forNamed.complaints.open).toBe(3);
    expect(open.caseId).toBeTruthy();

    expect(forAdmin.desks.map((d) => d.slug)).toEqual(["tusu", "tusc", null]);
    const tusu = forAdmin.desks.find((d) => d.slug === "tusu")!;
    expect(tusu.lastHandled).toBe(1);
    expect(forAdmin.desks.find((d) => d.slug === null)!.lastHandled).toBe(1);
  });
});

describe("the whole report", () => {
  it("is serialisable and carries no personal data", async () => {
    const t = await setupComplaints();
    for (let i = 0; i < 6; i++) await t.file();
    const report = await buildPerformanceReport(t.db, "all", new Date(NOW.getTime() + DAY));
    const json = JSON.stringify(report);
    expect(JSON.parse(json)).toEqual(report);
    for (const secret of ["Somchai", "somchai@example.com", "room 301", "tap", "Fix it"]) expect(json).not.toContain(secret);
    expect(report.complaints.received).toMatchObject({ suppressed: false, value: 6 });
    expect(report.generatedAt).toBe(new Date(NOW.getTime() + DAY).toISOString());
    expect(report.from).toBeNull();
  });

  it("an empty database reports nothing and does not throw", async () => {
    const t = await setupComplaints();
    const report = await buildPerformanceReport(t.db, "12m", NOW);
    expect(report.lostFound.lostReceived).toEqual({ suppressed: true });
    expect(report.complaints.byCategory).toEqual([]);
    expect(report.journeys).toHaveLength(4);
  });
});
