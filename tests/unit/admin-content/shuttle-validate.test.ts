import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validateShuttleForm } from "@/app/admin/content/shuttle/validate";
import { shuttleRoutes, shuttleStops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
const { saveContent } = await import("@/lib/admin/content/save");
const { readActiveShuttleRoutes } = await import("@/lib/content/shuttle");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string | string[]> = {
  slug: "loop",
  "name.th": "สายวนรอบ",
  "name.en": "Loop",
  isActive: "on",
  daysOfWeek: ["1", "2", "3"],
  "departures.0": "09:00",
  "departures.1": "8:00",
  "departures.2": "09:00",
  "stops.0.name.th": "ต้นทาง",
  "stops.0.name.en": "Start",
  "stops.0.offsetMinutes": "0",
  "stops.1.name.th": "ปลายทาง",
  "stops.1.name.en": "End",
  "stops.1.offsetMinutes": "10",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, id: string | null = null) => validateShuttleForm(db, { locale: "en", id, formData });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});
beforeEach(async () => {
  await db.delete(shuttleRoutes);
});

describe("validateShuttleForm", () => {
  it("sorts departures, drops repeats and keeps stops in order", async () => {
    const result = await validate(form({ "excludedDates.0": "2026-12-05", "excludedDates.1": "2026-12-05", addedDates: [] }, "publish"));
    expect(result).toMatchObject({ ok: true, data: { departures: ["08:00", "09:00"], excludedDates: ["2026-12-05"], daysOfWeek: [1, 2, 3] } });
    expect(result.ok && result.data.stops.map((s) => s.name.en)).toEqual(["Start", "End"]);
  });

  it("checks stop times run forward from 0 and reports on the right row", async () => {
    expect(await validate(form({ "stops.0.offsetMinutes": "3" }))).toMatchObject({ ok: false, errors: { "stops.0.offsetMinutes": expect.stringContaining("0") } });
    expect(await validate(form({ "stops.2.name.th": "ก", "stops.2.name.en": "C", "stops.2.offsetMinutes": "5" }))).toMatchObject({ ok: false, errors: { "stops.2.offsetMinutes": expect.stringContaining("less") } });
    expect(await validate(form({ "stops.1.name.en": "" }, "publish"))).toMatchObject({ ok: false, errors: { "stops.1.name.en": "Enter the stop in English" } });
    expect((await validate(form({ "stops.1.name.en": "", "stops.1.name.th": "" }, "save"))).ok && true).toBe(true);
  });

  it("checks times, dates and the validity window", async () => {
    expect(await validate(form({ "departures.3": "99:00" }))).toMatchObject({ ok: false, errors: { "departures.3": expect.stringContaining("08:30") } });
    expect(await validate(form({ "excludedDates.0": "2026-02-31" }))).toMatchObject({ ok: false, errors: { "excludedDates.0": expect.any(String) } });
    expect(await validate(form({ validFrom: "2026-12-01", validUntil: "2026-11-01" }))).toMatchObject({ ok: false, errors: { validUntil: expect.stringContaining("before") } });
  });

  it("lets a draft be incomplete but not a running published route", async () => {
    const empty = { daysOfWeek: [], "departures.0": "", "departures.1": "", "departures.2": "", "stops.0.name.th": "", "stops.0.name.en": "", "stops.1.name.th": "", "stops.1.name.en": "" };
    expect((await validate(form(empty, "save"))).ok).toBe(true);
    expect(await validate(form(empty, "publish"))).toMatchObject({ ok: false, errors: { daysOfWeek: expect.any(String), departures: expect.any(String), stops: expect.any(String) } });
    expect((await validate(form({ ...empty, isActive: [] }, "publish"))).ok).toBe(true);
  });

  it("requires a valid feed address when given", async () => {
    expect(await validate(form({ realtimeFeedUrl: "ftp://x" }))).toMatchObject({ ok: false, errors: { realtimeFeedUrl: expect.any(String) } });
  });

  it("saves so that the public read returns the route with stops in order", async () => {
    const checked = await validate(form({ "fare.en": "Free", "fare.th": "ฟรี", lastVerified: "2026-10-01" }, "publish"));
    if (!checked.ok) throw new Error("invalid");
    const d = checked.data;
    await saveContent({
      entityType: "shuttleRoute",
      table: shuttleRoutes,
      actor: { userId, context: { actorUserId: userId } },
      db,
      status: checked.status,
      values: { slug: d.slug, nameTh: d.name.th, nameEn: d.name.en, daysOfWeek: d.daysOfWeek, departures: d.departures, fareTh: d.fare.th, fareEn: d.fare.en, isActive: d.isActive, lastVerified: d.lastVerified },
      children: async (tx, routeId) => {
        await tx.delete(shuttleStops).where(eq(shuttleStops.routeId, routeId));
        await tx.insert(shuttleStops).values(d.stops.map((s, position) => ({ routeId, position, nameTh: s.name.th, nameEn: s.name.en, offsetMinutes: s.offsetMinutes })));
      },
    });
    const [route] = await readActiveShuttleRoutes(db);
    expect(route).toMatchObject({ slug: { current: "loop" }, departures: ["08:00", "09:00"], fare: { en: "Free" }, lastVerified: "2026-10-01", calendar: { daysOfWeek: [1, 2, 3] } });
    expect(route!.stops.map((s) => [s.name.en, s.offsetMinutes])).toEqual([["Start", 0], ["End", 10]]);
  });
});
