import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { validateLostFoundForm } from "@/app/admin/content/lost-and-found/validate";
import { images, places } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;

const VALID: Record<string, string> = {
  kind: "found",
  "title.th": "กุญแจ",
  "title.en": "Keys",
  "description.th": "พวงกุญแจสีแดง",
  "description.en": "A red keyring",
  category: "keys",
  placeId: "",
  "locationNote.th": "หน้าห้องสมุด",
  "locationNote.en": "Outside the library",
  occurredOn: "2026-10-20",
  registerStatus: "open",
  owner: "tusc",
  submitterContact: "0812345678",
  staffVerificationDetail: "Blue tag with a cat",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateLostFoundForm(db, { locale: extra.locale ?? "en", formData, existingStatus: extra.existingStatus });

beforeAll(async () => {
  ({ db } = await createTestDb());
});

beforeEach(async () => {
  await db.delete(images);
});

describe("validateLostFoundForm", () => {
  it("accepts a complete listing, keeping the private fields apart from the public ones", async () => {
    const result = await validate(form({}, "publish"));
    expect(result).toMatchObject({
      ok: true,
      status: "published",
      data: {
        kind: "found",
        category: "keys",
        owner: "tusc",
        occurredOn: "2026-10-20",
        claimContact: null,
        photos: [],
        submitterContact: "0812345678",
        staffVerificationDetail: "Blue tag with a cat",
      },
    });
    expect(result.ok && JSON.stringify([result.data.title, result.data.description, result.data.locationNote])).not.toContain("0812345678");
  });

  it("lets a draft report have one language, but not publish", async () => {
    const half = { "title.en": "", "description.en": "", "locationNote.en": "" };
    expect((await validate(form(half))).ok).toBe(true);
    expect(await validate(form(half, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "description.en": "Enter the description of the item in English" },
    });
  });

  it("needs a place or a written location to publish, not to save", async () => {
    const none = { "locationNote.th": "", "locationNote.en": "" };
    expect((await validate(form(none))).ok).toBe(true);
    expect(await validate(form(none, "publish"))).toMatchObject({ ok: false, errors: { placeId: expect.stringContaining("Choose a place") } });
    const [place] = await db.insert(places).values({ slug: "library", nameTh: "ห้องสมุด", nameEn: "Library", category: "welfare" }).onConflictDoNothing().returning({ id: places.id });
    expect((await validate(form({ ...none, placeId: place!.id }, "publish"))).ok).toBe(true);
    expect(await validate(form({ placeId: "00000000-0000-4000-8000-000000000000" }))).toMatchObject({ ok: false, errors: { placeId: expect.any(String) } });
  });

  it("checks the choices and the date", async () => {
    expect(await validate(form({ kind: "borrowed", category: "", owner: "", registerStatus: "gone" }))).toMatchObject({
      ok: false,
      errors: { kind: expect.any(String), category: expect.any(String), owner: expect.any(String), registerStatus: expect.any(String) },
    });
    expect(await validate(form({ occurredOn: "2026-02-31" }))).toMatchObject({ ok: false, errors: { occurredOn: expect.stringContaining("real date") } });
    expect(await validate(form({ occurredOn: "" }))).toMatchObject({ ok: false, errors: { occurredOn: expect.any(String) } });
  });

  it("treats the claim contact as all or nothing", async () => {
    expect(await validate(form({ claimValue: "0299999999" }))).toMatchObject({
      ok: false,
      errors: { "claimLabel.th": expect.any(String), claimChannel: expect.any(String) },
    });
    const ok = await validate(
      form({ "claimLabel.th": "ห้อง อมธ.", "claimLabel.en": "TUSU office", claimChannel: "phone", claimValue: "0299999999", "claimHours.th": "จ-ศ", "claimHours.en": "Mon-Fri" }, "publish"),
    );
    expect(ok).toMatchObject({
      ok: true,
      data: { claimContact: { label: { th: "ห้อง อมธ.", en: "TUSU office" }, channel: "phone", value: "0299999999", hours: { th: "จ-ศ", en: "Mon-Fri" } } },
    });
    expect(await validate(form({ "claimLabel.th": "ก", "claimLabel.en": "a", claimChannel: "url", claimValue: "javascript:alert(1)" }))).toMatchObject({
      ok: false,
      errors: { claimValue: expect.any(String) },
    });
  });

  it("refuses unknown or undescribed photos when publishing", async () => {
    const [described] = await db.insert(images).values({ storageKey: "lf/a.jpg", altTh: "ก", altEn: "a" }).returning();
    const [bare] = await db.insert(images).values({ storageKey: "lf/b.jpg" }).returning();
    expect(await validate(form({ photos: [described!.id] }, "publish"))).toMatchObject({ ok: true, data: { photos: [described!.id] } });
    expect(await validate(form({ photos: [bare!.id] }))).toMatchObject({ ok: true });
    expect(await validate(form({ photos: [bare!.id] }, "publish"))).toMatchObject({ ok: false, errors: { photos: expect.stringContaining("no description") } });
    expect(await validate(form({ photos: ["00000000-0000-4000-8000-000000000000"] }))).toMatchObject({ ok: false, errors: { photos: expect.any(String) } });
  });

  it("limits the private fields and reports errors in Thai", async () => {
    expect(await validate(form({ staffVerificationDetail: "x".repeat(2001) }))).toMatchObject({ ok: false, errors: { staffVerificationDetail: expect.stringContaining("2000") } });
    expect(await validate(form({ "title.th": "", "title.en": "" }), { locale: "th" })).toMatchObject({ ok: false, errors: { "title.th": expect.stringContaining("กรอก") } });
  });

  it("applies the published rules when saving changes to a live listing", async () => {
    expect(await validate(form({ "title.en": "" }), { existingStatus: "published" })).toMatchObject({ ok: false, errors: { "title.en": "Enter the title in English" } });
  });
});
