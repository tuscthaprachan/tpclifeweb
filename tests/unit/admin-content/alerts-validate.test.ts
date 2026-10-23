import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { alertValues, validateAlertForm } from "@/app/admin/content/alerts/validate";
import { serviceAlerts } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent } = await import("@/lib/admin/content/save");
const { readActiveServiceAlerts } = await import("@/lib/content/site");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string> = {
  "title.th": "รถรับส่งหยุดวิ่ง",
  "title.en": "Shuttle suspended",
  "body.th": "รถรับส่งหยุดวิ่งชั่วคราว",
  "body.en": "The shuttle is paused",
  severity: "warning",
  startsAt: "2026-10-23T09:00",
  endsAt: "",
  moreInfoUrl: "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateAlertForm(db, { locale: extra.locale ?? "en", id: null, formData, existingStatus: extra.existingStatus });

beforeAll(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(serviceAlerts);
});

describe("validateAlertForm", () => {
  it("accepts a complete alert and reads the times as Thailand time", async () => {
    const result = await validate(form({ affects: ["shuttle", "forms"], endsAt: "2026-10-24T18:00", moreInfoUrl: "https://example.com/news" }, "publish"));
    expect(result).toMatchObject({
      ok: true,
      status: "published",
      data: {
        severity: "warning",
        affects: ["shuttle", "forms"],
        startsAt: new Date("2026-10-23T02:00:00Z"),
        endsAt: new Date("2026-10-24T11:00:00Z"),
        moreInfoUrl: "https://example.com/news",
      },
    });
  });

  it("requires a title and message in at least one language, and both once published", async () => {
    expect(await validate(form({ "title.th": "", "title.en": "" }))).toMatchObject({ ok: false, errors: { "title.th": "Enter the title" } });
    expect(await validate(form({ "body.th": "", "body.en": "" }))).toMatchObject({ ok: false, errors: { "body.th": "Enter the details" } });
    expect((await validate(form({ "title.en": "", "body.en": "" }, "save"))).ok).toBe(true);
    expect(await validate(form({ "title.en": "", "body.en": "" }, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "body.en": "Enter the details in English" },
    });
  });

  it("applies the published rules when saving changes to a live alert", async () => {
    expect(await validate(form({ "title.en": "" }, "save"), { existingStatus: "published" })).toMatchObject({ ok: false, errors: { "title.en": expect.any(String) } });
  });

  it("requires a start time, a real severity and a known place on the site", async () => {
    expect(await validate(form({ startsAt: "" }))).toMatchObject({ ok: false, errors: { startsAt: "Enter the starts showing" } });
    expect(await validate(form({ severity: "doom" }))).toMatchObject({ ok: false, errors: { severity: expect.any(String) } });
    expect(await validate(form({ affects: ["moon"] }))).toMatchObject({ ok: false, errors: { affects: expect.any(String) } });
  });

  it("keeps the end after the start", async () => {
    expect(await validate(form({ endsAt: "2026-10-23T08:59" }))).toMatchObject({
      ok: false,
      errors: { endsAt: "The time it stops showing must not be before the time it starts" },
    });
    expect((await validate(form({ endsAt: "2026-10-23T09:00" }))).ok).toBe(true);
    expect(await validate(form({ endsAt: "2026-10-23T08:00" }), { locale: "th" })).toMatchObject({ ok: false, errors: { endsAt: expect.stringContaining("เวลาที่หยุดแสดง") } });
  });

  it("rejects an unsafe more-information link", async () => {
    expect(await validate(form({ moreInfoUrl: "javascript:alert(1)" }))).toMatchObject({ ok: false, errors: { moreInfoUrl: expect.any(String) } });
  });

  it("saves a published edit that the public read returns, inside its window only", async () => {
    const checked = await validate(form({ affects: "campus", endsAt: "2026-10-24T18:00" }, "publish"));
    if (!checked.ok) throw new Error("expected valid");
    const { id } = await saveContent({
      entityType: "serviceAlert",
      table: serviceAlerts,
      actor: { userId, context: { actorUserId: userId } },
      db,
      status: checked.status,
      values: alertValues(checked.data),
    });

    const live = await readActiveServiceAlerts(db, "2026-10-23T10:00:00Z");
    expect(live).toMatchObject([
      { _id: id, title: { th: "รถรับส่งหยุดวิ่ง", en: "Shuttle suspended" }, severity: "warning", affects: ["campus"], endsAt: "2026-10-24T11:00:00.000Z" },
    ]);
    expect(await readActiveServiceAlerts(db, "2026-10-23T01:00:00Z")).toHaveLength(0);
    expect(await readActiveServiceAlerts(db, "2026-10-25T00:00:00Z")).toHaveLength(0);

    const edit = await validate(form({ "title.en": "Shuttle back soon", severity: "critical" }, "save"), { existingStatus: "published" });
    if (!edit.ok) throw new Error("expected valid");
    await saveContent({
      entityType: "serviceAlert",
      table: serviceAlerts,
      actor: { userId, context: { actorUserId: userId } },
      db,
      id,
      status: edit.status,
      values: alertValues(edit.data),
    });
    const after = await readActiveServiceAlerts(db, "2026-10-23T10:00:00Z");
    expect(after).toMatchObject([{ title: { en: "Shuttle back soon" }, severity: "critical", affects: undefined }]);
  });

  it("does not show a draft", async () => {
    const checked = await validate(form({}, "save"));
    if (!checked.ok) throw new Error("expected valid");
    await saveContent({ entityType: "serviceAlert", table: serviceAlerts, actor: { userId, context: { actorUserId: userId } }, db, status: checked.status, values: alertValues(checked.data) });
    expect(await readActiveServiceAlerts(db, "2026-10-23T10:00:00Z")).toHaveLength(0);
  });
});
