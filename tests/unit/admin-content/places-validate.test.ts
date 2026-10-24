import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { placeUsage } from "@/app/admin/content/places/usage";
import { validatePlaceForm } from "@/app/admin/content/places/validate";
import { events, places } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
const { saveContent } = await import("@/lib/admin/content/save");
const { readPlaces } = await import("@/lib/content/directory");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string | string[]> = {
  slug: "library",
  "name.th": "ห้องสมุด",
  "name.en": "Library",
  category: "welfare",
  "openingHours.0.days": ["1", "2", "3", "4", "5"],
  "openingHours.0.opens": "08:30",
  "openingHours.0.closes": "16:30",
  lat: "13.7563",
  lng: "100.4895",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; locale?: "th" | "en" } = {}) =>
  validatePlaceForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});
beforeEach(async () => {
  await db.delete(events);
  await db.delete(places);
});

describe("validatePlaceForm", () => {
  it("parses opening hours into structured rows", async () => {
    const result = await validate(form({ "openingHours.1.days": "0", "openingHours.1.opens": "9:00", "openingHours.1.closes": "12:00", "openingHours.1.note.en": "Short day", "openingHours.1.note.th": "ครึ่งวัน" }, "publish"));
    expect(result.ok && result.data.openingHours).toEqual([
      { daysOfWeek: [1, 2, 3, 4, 5], opens: "08:30", closes: "16:30" },
      { daysOfWeek: [0], opens: "09:00", closes: "12:00", note: { th: "ครึ่งวัน", en: "Short day" } },
    ]);
    expect(result.ok && result.data.lat).toBe(13.7563);
  });

  it("rejects missing days, bad times and closing before opening", async () => {
    expect(await validate(form({ "openingHours.0.days": [] }))).toMatchObject({ ok: false, errors: { "openingHours.0.days": "Select at least one day" } });
    expect(await validate(form({ "openingHours.0.opens": "25:00" }))).toMatchObject({ ok: false, errors: { "openingHours.0.opens": expect.stringContaining("08:30") } });
    expect(await validate(form({ "openingHours.0.closes": "08:30" }))).toMatchObject({ ok: false, errors: { "openingHours.0.closes": expect.stringContaining("later") } });
  });

  it("checks coordinates are numbers in range and come as a pair", async () => {
    expect(await validate(form({ lat: "abc" }))).toMatchObject({ ok: false, errors: { lat: expect.any(String) } });
    expect(await validate(form({ lat: "95" }))).toMatchObject({ ok: false, errors: { lat: expect.stringContaining("between") } });
    expect(await validate(form({ lng: "" }))).toMatchObject({ ok: false, errors: { lng: expect.stringContaining("both") } });
    expect((await validate(form({ lat: "", lng: "" }))).ok).toBe(true);
  });

  it("requires name, category and (to publish) both languages", async () => {
    expect(await validate(form({ "name.th": "", "name.en": "", category: "" }))).toMatchObject({ ok: false, errors: { "name.th": expect.any(String), category: expect.any(String) } });
    expect(await validate(form({ "name.en": "" }, "publish"))).toMatchObject({ ok: false, errors: { "name.en": "Enter the name in English" } });
  });

  it("saves so that the public read returns what was edited", async () => {
    const checked = await validate(form({ isKeyLocation: "on", "closureNote.th": "ปิดซ่อม", "closureNote.en": "Closed for repairs" }, "publish"));
    if (!checked.ok) throw new Error("invalid");
    const d = checked.data;
    await saveContent({
      entityType: "place",
      table: places,
      actor: { userId, context: { actorUserId: userId } },
      db,
      status: checked.status,
      values: { slug: d.slug, nameTh: d.name.th, nameEn: d.name.en, category: d.category, openingHours: d.openingHours, closureNoteTh: d.closureNote.th, closureNoteEn: d.closureNote.en, lat: d.lat, lng: d.lng, isKeyLocation: d.isKeyLocation },
    });
    const [place] = await readPlaces(db, true);
    expect(place).toMatchObject({ slug: { current: "library" }, category: "welfare", closureNote: { en: "Closed for repairs" }, lat: 13.7563, isKeyLocation: true });
    expect(place!.openingHours?.[0]).toMatchObject({ daysOfWeek: [1, 2, 3, 4, 5], opens: "08:30" });
  });
});

describe("placeUsage", () => {
  it("counts the records that still point at a place", async () => {
    const [place] = await db.insert(places).values({ slug: "hall", category: "activity" }).returning();
    expect((await placeUsage(db, place!.id)).total).toBe(0);
    await db.insert(events).values({ slug: "e", startsAt: new Date(), owner: "tusu", placeId: place!.id });
    expect(await placeUsage(db, place!.id)).toMatchObject({ events: 1, total: 1 });
  });
});
