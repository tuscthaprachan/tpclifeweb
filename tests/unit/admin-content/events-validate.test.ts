import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eventValues, validateEventForm } from "@/app/admin/content/events/validate";
import { events, forms, images, places } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent } = await import("@/lib/admin/content/save");
const { readEventBySlug, readUpcomingEvents } = await import("@/lib/content/events");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const VALID: Record<string, string> = {
  slug: "open-house",
  "title.th": "วันเปิดบ้าน",
  "title.en": "Open house",
  "summary.th": "สรุป",
  "summary.en": "Summary",
  "body.th": "",
  "body.en": "",
  startsAt: "2026-11-01T10:00",
  endsAt: "2026-11-01T16:00",
  "location.th": "",
  "location.en": "",
  place: "",
  owner: "tusu",
  category: "",
  cover: "",
  relatedForm: "",
  registrationUrl: "",
  "cancellationNote.th": "",
  "cancellationNote.en": "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateEventForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });
const actor = () => ({ userId, context: { actorUserId: userId } });

beforeAll(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(events);
  await db.delete(images);
  await db.delete(places);
  await db.delete(forms);
});

describe("validateEventForm", () => {
  it("accepts a complete event", async () => {
    const result = await validate(form({}, "publish"));
    expect(result).toMatchObject({
      ok: true,
      status: "published",
      data: { slug: "open-house", startsAt: new Date("2026-11-01T03:00:00Z"), endsAt: new Date("2026-11-01T09:00:00Z"), isAllDay: false, isCancelled: false, category: null },
    });
  });

  it("needs title, summary, start and owner; drafts may be single-language, published may not", async () => {
    expect(await validate(form({ "title.th": "", "title.en": "", startsAt: "", owner: "" }))).toMatchObject({
      ok: false,
      errors: { "title.th": "Enter the title", startsAt: "Enter the starts", owner: "Select the responsible body" },
    });
    const half = { "title.en": "", "summary.en": "" };
    expect((await validate(form(half, "save"))).ok).toBe(true);
    expect(await validate(form(half, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "summary.en": "Enter the summary in English" },
    });
  });

  it("wants the optional bilingual text in both languages or neither once published", async () => {
    expect(await validate(form({ "location.th": "ห้องใหญ่" }, "save"))).toMatchObject({ ok: true });
    expect(await validate(form({ "location.th": "ห้องใหญ่" }, "publish"))).toMatchObject({ ok: false, errors: { "location.en": expect.any(String) } });
    expect(await validate(form({ "body.th": doc("เนื้อหา") }, "publish"))).toMatchObject({ ok: false, errors: { "body.en": expect.any(String) } });
  });

  it("keeps the end after the start", async () => {
    expect(await validate(form({ endsAt: "2026-11-01T09:00" }))).toMatchObject({ ok: false, errors: { endsAt: "The end time must be after the start time" } });
    expect(await validate(form({ endsAt: "2026-11-01T10:00" }))).toMatchObject({ ok: false, errors: { endsAt: expect.any(String) } });
    expect((await validate(form({ endsAt: "" }))).ok).toBe(true);
    expect(await validate(form({ endsAt: "2026-10-31T10:00" }, "save"), { locale: "th" })).toMatchObject({ ok: false, errors: { endsAt: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" } });
  });

  it("checks the slug and ignores the event itself", async () => {
    expect(await validate(form({ slug: "Open House" }))).toMatchObject({ ok: false, errors: { slug: expect.stringContaining("lower case") } });
    const [existing] = await db.insert(events).values({ slug: "open-house", startsAt: new Date(), owner: "tusc" }).returning();
    expect(await validate(form())).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
    expect((await validate(form(), { id: existing!.id })).ok).toBe(true);
  });

  it("checks the cover, place, related form and registration link", async () => {
    const [bare] = await db.insert(images).values({ storageKey: "content/images/b.jpg" }).returning();
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(await validate(form({ cover: bare!.id }, "save"))).toMatchObject({ ok: true });
    expect(await validate(form({ cover: bare!.id }, "publish"))).toMatchObject({ ok: false, errors: { cover: expect.stringContaining("no description") } });
    expect(await validate(form({ cover: missing, place: missing, relatedForm: missing }))).toMatchObject({
      ok: false,
      errors: { cover: expect.any(String), place: expect.any(String), relatedForm: expect.any(String) },
    });
    expect(await validate(form({ registrationUrl: "ftp://x" }))).toMatchObject({ ok: false, errors: { registrationUrl: expect.any(String) } });
  });

  it("saves a published edit that the public read returns", async () => {
    const [place] = await db.insert(places).values({ slug: "hall", nameTh: "ห้อง", nameEn: "Hall", category: "activity", status: "published" }).returning();
    const checked = await validate(
      form({ "body.th": doc("เนื้อหา"), "body.en": doc("Body"), "location.th": "ห้องใหญ่", "location.en": "Main hall", place: place!.id, endsAt: "" }, "publish"),
    );
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
    const { id } = await saveContent({ entityType: "event", table: events, actor: actor(), db, status: checked.status, values: eventValues(checked.data) });

    const found = await readEventBySlug(db, "open-house");
    expect(found).toMatchObject({
      _id: id,
      title: { th: "วันเปิดบ้าน", en: "Open house" },
      startsAt: "2026-11-01T03:00:00.000Z",
      endsAt: undefined,
      location: { th: "ห้องใหญ่", en: "Main hall" },
      place: { slug: { current: "hall" } },
      isCancelled: false,
    });

    const edit = await validate(
      form({ "title.en": "Open house (cancelled)", "cancellationNote.th": "เลื่อน", "cancellationNote.en": "Postponed", isCancelled: "on", isAllDay: "on", endsAt: "" }, "save"),
      { id, existingStatus: "published" },
    );
    if (!edit.ok) throw new Error(JSON.stringify(edit.errors));
    await saveContent({ entityType: "event", table: events, actor: actor(), db, id, status: edit.status, values: eventValues(edit.data) });
    expect(await readEventBySlug(db, "open-house")).toMatchObject({
      title: { en: "Open house (cancelled)" },
      isCancelled: true,
      isAllDay: true,
      cancellationNote: { th: "เลื่อน", en: "Postponed" },
      location: undefined,
    });
    expect(await readUpcomingEvents(db, "2026-10-01T00:00:00Z")).toHaveLength(1);
    expect(await readUpcomingEvents(db, "2026-12-01T00:00:00Z")).toHaveLength(0);
  });

  it("does not show a draft", async () => {
    const checked = await validate(form({}, "save"));
    if (!checked.ok) throw new Error("expected valid");
    await saveContent({ entityType: "event", table: events, actor: actor(), db, status: checked.status, values: eventValues(checked.data) });
    expect(await readEventBySlug(db, "open-house")).toBeNull();
  });
});
