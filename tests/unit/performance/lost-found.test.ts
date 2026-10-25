/** Lost and found measures on PGlite: the definitions in lib/performance/lost-found.ts, and the five-case rule. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createCase, transition, type StaffActor } from "@/lib/cases";
import { lostFoundMeasures } from "@/lib/performance/lost-found";
import { rangeFor } from "@/lib/performance/period";
import { setup } from "../cases/helpers";

// Each suite builds a migrated database, which is slow on a busy runner.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const DAY = 86_400_000;
const NOW = new Date("2026-06-15T05:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

let t: Awaited<ReturnType<typeof setup>>;
let officer: StaffActor;
beforeAll(async () => {
  t = await setup();
  officer = await t.staff("Officer", "lf_officer", "tusu");
});

const range = (period: "30d" | "12m" | "all" = "all") => rangeFor(period, NOW);

async function found(createdDaysAgo: number, by: "public" | "staff", to?: { status: string; afterDays: number }) {
  const actor = by === "staff" ? officer : ({ kind: "public" } as const);
  const c = await createCase(t.db, { service: "lost_found", kind: "found", summary: "Found: keys" }, actor, { now: ago(createdDaysAgo) });
  if (to) await transition(t.db, c.id, to.status, officer, { now: ago(createdDaysAgo - to.afterDays) });
  return c;
}
async function lost(createdDaysAgo: number, by: "public" | "staff") {
  const actor = by === "staff" ? officer : ({ kind: "public" } as const);
  return createCase(t.db, { service: "lost_found", kind: "lost", summary: "Lost: wallet" }, actor, { now: ago(createdDaysAgo) });
}

describe("with fewer than five cases", () => {
  it("publishes no figure at all", async () => {
    const m = await lostFoundMeasures(t.db, range());
    for (const figure of Object.values(m)) expect(figure).toEqual({ suppressed: true });
  });
});

describe("lost and found measures", () => {
  beforeAll(async () => {
    // 9 found, 6 lost, in the last 100 days.
    // Found: 5 returned (2, 4, 6, 8 and 10 days after logging), 1 withdrawn in error, 3 still held; all but one older than 30 days.
    await found(100, "staff", { status: "returned", afterDays: 10 });
    await found(90, "staff", { status: "returned", afterDays: 2 });
    await found(80, "public", { status: "returned", afterDays: 4 });
    await found(70, "staff", { status: "returned", afterDays: 6 });
    await found(60, "staff", { status: "returned", afterDays: 8 });
    await found(50, "staff", { status: "withdrawn", afterDays: 1 });
    await found(45, "public");
    await found(40, "staff");
    await found(5, "staff");
    for (let i = 0; i < 4; i++) await lost(20 + i, "public");
    await lost(10, "staff");
    await lost(9, "staff");
  });

  it("counts reports received by kind", async () => {
    const m = await lostFoundMeasures(t.db, range());
    expect(m.foundReceived).toMatchObject({ suppressed: false, value: 9 });
    expect(m.lostReceived).toMatchObject({ suppressed: false, value: 6 });
  });

  it("counts found items returned, by when they were returned", async () => {
    expect((await lostFoundMeasures(t.db, range())).returned).toMatchObject({ suppressed: false, value: 5 });
    // Within the last 30 days nothing was returned, so there is nothing to show.
    expect((await lostFoundMeasures(t.db, range("30d"))).returned).toEqual({ suppressed: true });
  });

  it("return rate is returned over found items at least 30 days old, leaving out removals in error", async () => {
    const m = await lostFoundMeasures(t.db, range());
    // Mature and not withdrawn: 100, 90, 80, 70, 60, 45, 40 days old = 7 items, 5 returned.
    expect(m.returnRate).toEqual({ suppressed: false, n: 7, value: 71 });
    // The last 30 days hold no item old enough to judge.
    expect((await lostFoundMeasures(t.db, range("30d"))).returnRate).toEqual({ suppressed: true });
  });

  it("median days from found to returned", async () => {
    const m = await lostFoundMeasures(t.db, range());
    expect(m.medianDaysToReturn).toEqual({ suppressed: false, n: 5, value: 6 });
  });

  it("digital take-up is the share of reports that came from a public journey", async () => {
    const m = await lostFoundMeasures(t.db, range());
    // 15 reports; online: found 80 and 45 days ago, lost x4 = 6.
    expect(m.onlineShare).toEqual({ suppressed: false, n: 15, value: 40 });
  });

  it("a period limits the cases counted", async () => {
    const m = await lostFoundMeasures(t.db, range("30d"));
    // Within 30 days: found 5 days ago (1), lost x6.
    expect(m.foundReceived).toEqual({ suppressed: true });
    expect(m.lostReceived).toMatchObject({ suppressed: false, value: 6 });
  });
});

describe("median days to return", () => {
  it("is the median of logged to returned, shown once five items are returned", async () => {
    const t2 = await setup();
    const o = await t2.staff("Officer", "lf_officer", "tusc");
    for (const days of [1, 2, 3, 10, 20]) {
      const c = await createCase(t2.db, { service: "lost_found", kind: "found", summary: "Found" }, o, { now: ago(40) });
      await transition(t2.db, c.id, "returned", o, { now: new Date(ago(40).getTime() + days * DAY) });
    }
    const m = await lostFoundMeasures(t2.db, range());
    expect(m.medianDaysToReturn).toEqual({ suppressed: false, n: 5, value: 3 });
    expect(m.returned).toMatchObject({ suppressed: false, value: 5 });
  });
});
