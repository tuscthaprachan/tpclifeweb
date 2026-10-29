/** Complaint measures on PGlite: the definitions in lib/performance/complaints.ts, the five-case rule and the Sensitive grouping. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { acknowledgeComplaint, redirectComplaint, reopenComplaint, resolveComplaint } from "@/lib/complaints/workflow";
import { faculties } from "@/lib/db/schema";
import { seedFaculties } from "@/lib/db/seed/faculties";
import { submitSurvey } from "@/lib/complaints/survey";
import { complaintMeasures } from "@/lib/performance/complaints";
import { rangeFor } from "@/lib/performance/period";
import { env, NOW, setupComplaints, type Ctx } from "../complaints/helpers";

// Each suite builds a migrated database, which is slow on a busy runner.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const LATER = at(40);
const measures = (t: Ctx, period: "30d" | "12m" | "all" = "all", now = LATER) => complaintMeasures(t.db, rangeFor(period, now), now, period !== "30d");

describe("with fewer than five complaints", () => {
  it("publishes no figure at all", async () => {
    const t = await setupComplaints();
    for (let i = 0; i < 4; i++) {
      const c = await t.file();
      await acknowledgeComplaint(t.db, c.caseId, {}, t.handler, { now: at(1) });
      await resolveComplaint(t.db, c.caseId, { outcome: { en: "Fixed" } }, t.handler, { now: at(2) });
      await submitSurvey(t.db, c.caseId, { score: 5 }, {}, { now: at(3), env });
    }
    const m = await measures(t);
    expect(m.received).toEqual({ suppressed: true });
    for (const key of ["acknowledgedOnTime", "resolvedOnTime", "medianDaysToResolution", "satisfactionMean", "satisfiedShare", "reopenRate", "onlineShare"] as const) {
      expect(m[key], key).toEqual({ suppressed: true });
    }
    expect(m.byCategory).toEqual([]);
    expect(m.byMonth.every((row) => row.received.suppressed)).toBe(true);
  });
});

describe("complaint measures", () => {
  let t: Ctx;
  beforeAll(async () => {
    t = await setupComplaints();
    // Ten facilities complaints on the same Monday: acknowledge target 2 working days, resolve target 10.
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) ids.push((await t.file()).caseId);
    // Acknowledged: eight on time (day 1), one late (day 5), one never.
    for (const id of ids.slice(0, 8)) await acknowledgeComplaint(t.db, id, {}, t.handler, { now: at(1) });
    await acknowledgeComplaint(t.db, ids[8]!, {}, t.handler, { now: at(5) });
    // Resolved: six on day 3, one late on day 20, three never (their target passed on day 14).
    for (const id of ids.slice(0, 6)) await resolveComplaint(t.db, id, { outcome: { en: "Fixed" } }, t.handler, { now: at(3) });
    await resolveComplaint(t.db, ids[8]!, { outcome: { en: "Fixed late" } }, t.handler, { now: at(20) });
    // One of the six is reopened by the person.
    await reopenComplaint(t.db, ids[0]!, { reason: "Still leaking" }, { kind: "public" }, { now: at(5), env });
    // Survey answers: five of the resolved complaints.
    const scores = [5, 4, 4, 3, 1];
    for (const [i, score] of scores.entries()) await submitSurvey(t.db, ids[i + 1]!, { score }, {}, { now: at(6), env });
  });

  it("counts complaints received, by month and by category", async () => {
    const m = await measures(t, "12m");
    expect(m.received).toMatchObject({ suppressed: false, value: 10 });
    expect((await measures(t)).byMonth.map((row) => row.month)).toEqual(["2026-03", "2026-04"]);
    expect(m.byMonth).toHaveLength(12);
    expect(m.byMonth[0]?.month).toBe("2025-05");
    expect(m.byMonth.at(-2)).toMatchObject({ month: "2026-03", received: { suppressed: false, value: 10 } });
    expect(m.byMonth.at(-1)).toEqual({ month: "2026-04", received: { suppressed: true } });
    expect(m.byCategory).toEqual([expect.objectContaining({ type: "category", key: "facilities", n: 10 })]);
  });

  it("acknowledged on time: acknowledged by the date, of those acknowledged or past the date", async () => {
    expect((await measures(t)).acknowledgedOnTime).toEqual({ suppressed: false, n: 10, value: 80 });
  });

  it("resolved on time: resolved by the date, of those resolved or past the date", async () => {
    // Ten in the base. On time: ids 1 to 5 (day 3). Not: id 8 (day 20, target day 14), id 0 (reopened, so unresolved with a new target that has passed) and the three never resolved.
    expect((await measures(t)).resolvedOnTime).toEqual({ suppressed: false, n: 10, value: 50 });
  });

  it("median days to resolution, for complaints resolved in the period", async () => {
    const m = await measures(t);
    // Resolved now: ids 1..5 on day 3 and id 8 on day 20 (id 0 was reopened): six, median 3.
    expect(m.medianDaysToResolution).toEqual({ suppressed: false, n: 6, value: 3 });
  });

  it("satisfaction: mean score and the share scoring 4 or 5, with the response count", async () => {
    const m = await measures(t);
    expect(m.satisfactionMean).toEqual({ suppressed: false, n: 5, value: 3.4 });
    expect(m.satisfiedShare).toEqual({ suppressed: false, n: 5, value: 60 });
  });

  it("reopen rate: reopened, of complaints resolved at least once", async () => {
    // Resolved at least once: ids 0..5 and 8 = 7 (id 0 is reopened and so has no resolved date but a reopen count).
    expect((await measures(t)).reopenRate).toEqual({ suppressed: false, n: 7, value: 14 });
  });

  it("digital take-up: complaints made on the public journey", async () => {
    expect((await measures(t)).onlineShare).toEqual({ suppressed: false, n: 10, value: 100 });
  });

  it("a complaint recorded by staff counts as desk-logged", async () => {
    const t2 = await setupComplaints();
    for (let i = 0; i < 6; i++) {
      const cat = (await t2.category("facilities")).id;
      const { createComplaint } = await import("@/lib/complaints/create");
      await createComplaint(
        t2.db,
        { categoryId: cat, identity: "named", description: "x", contact: { role: "reporter", name: "N", email: "n@example.com", preferredContact: "email", consentContact: true }, locale: "en" },
        i < 2 ? t2.handler : { kind: "public" },
        { now: NOW, env },
      );
    }
    expect((await measures(t2)).onlineShare).toEqual({ suppressed: false, n: 6, value: 67 });
  });

  it("the last 30 days has no monthly table", async () => {
    expect((await measures(t, "30d", at(10))).byMonth).toEqual([]);
  });

  it("a figure outside the period is not counted", async () => {
    const m = await measures(t, "30d", at(60));
    expect(m.received).toEqual({ suppressed: true });
  });
});

describe("restricted categories", () => {
  it("are grouped as Sensitive and never named", async () => {
    const t = await setupComplaints();
    for (let i = 0; i < 6; i++) await t.file({ key: "facilities" });
    for (let i = 0; i < 3; i++) await t.file({ key: "harassment" });
    for (let i = 0; i < 3; i++) await t.file({ key: "safety" });
    const m = await measures(t);
    expect(m.received).toMatchObject({ suppressed: false, value: 12 });
    expect(m.byCategory).toEqual([expect.objectContaining({ key: "facilities", n: 6 }), { type: "pool", pool: "sensitive", n: 6 }]);
    expect(JSON.stringify(m)).not.toMatch(/harassment|safety/);
  });

  it("a Sensitive group under five is merged so it cannot be found by subtraction", async () => {
    const t = await setupComplaints();
    for (let i = 0; i < 8; i++) await t.file({ key: "facilities" });
    for (let i = 0; i < 2; i++) await t.file({ key: "harassment" });
    const m = await measures(t);
    expect(m.byCategory.every((row) => row.n >= 5)).toBe(true);
    expect(m.byCategory).toEqual([{ type: "pool", pool: "sensitive_other", n: 10 }]);
    expect(JSON.stringify(m)).not.toMatch(/harassment|facilities/);
  });
});

describe("redirected complaints", () => {
  let t: Ctx;
  beforeAll(async () => {
    t = await setupComplaints();
    await seedFaculties(t.db);
    const [law] = await t.db.select().from(faculties);
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) ids.push((await t.file()).caseId);
    // Five are answered on time; five are outside the union's remit and redirected, never acknowledged.
    for (const id of ids.slice(0, 5)) {
      await acknowledgeComplaint(t.db, id, {}, t.handler, { now: at(1) });
      await resolveComplaint(t.db, id, { outcome: { en: "Fixed" } }, t.handler, { now: at(3) });
    }
    for (const [i, id] of ids.slice(5).entries()) await redirectComplaint(t.db, id, { level: i % 2 === 0 ? "faculty" : "course", facultyId: law!.id }, t.handler, { now: at(1) });
  });

  it("counts them as received and, separately, as redirected", async () => {
    const m = await measures(t);
    expect(m.received).toEqual({ suppressed: false, n: 10, value: 10 });
    expect(m.redirected).toEqual({ suppressed: false, n: 5, value: 5 });
  });

  it("leaves them out of acknowledged on time, resolved on time and the median", async () => {
    const m = await measures(t);
    // Without the exclusion their passed targets would make the base 10 and the rates 50.
    expect(m.acknowledgedOnTime).toEqual({ suppressed: false, n: 5, value: 100 });
    expect(m.resolvedOnTime).toEqual({ suppressed: false, n: 5, value: 100 });
    expect(m.medianDaysToResolution).toEqual({ suppressed: false, n: 5, value: 3 });
  });

  it("hides the redirected count below five, like any figure", async () => {
    const t2 = await setupComplaints();
    await seedFaculties(t2.db);
    const [faculty] = await t2.db.select().from(faculties);
    for (let i = 0; i < 6; i++) {
      const c = await t2.file();
      if (i < 4) await redirectComplaint(t2.db, c.caseId, { level: "course", facultyId: faculty!.id }, t2.handler, { now: at(1) });
    }
    const m = await measures(t2);
    expect(m.received).toMatchObject({ suppressed: false, value: 6 });
    expect(m.redirected).toEqual({ suppressed: true });
  });
});
