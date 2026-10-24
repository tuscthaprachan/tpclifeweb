import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validateOrganisationForm } from "@/app/admin/content/organisations/validate";
import { directoryOrganisations } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
const { saveContent } = await import("@/lib/admin/content/save");
const { readOrganisations } = await import("@/lib/content/directory");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string | string[]> = {
  slug: "film-club",
  "name.th": "ชมรมภาพยนตร์",
  "name.en": "Film Club",
  type: "club",
  isActive: "on",
  "contacts.0.channel": "instagram",
  "contacts.0.value": "@film.club",
  "contacts.0.label.th": "",
  "contacts.0.label.en": "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateOrganisationForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});
beforeEach(async () => {
  await db.delete(directoryOrganisations);
});

describe("validateOrganisationForm", () => {
  it("accepts a complete entry and tidies the contact handle", async () => {
    const result = await validate(form({}, "publish"));
    expect(result).toMatchObject({ ok: true, status: "published", data: { slug: "film-club", type: "club", isActive: true, contacts: [{ channel: "instagram", value: "film.club" }] } });
  });

  it("needs a name and type; both languages only when publishing", async () => {
    expect(await validate(form({ "name.th": "", "name.en": "", type: "" }))).toMatchObject({ ok: false, errors: { "name.th": expect.any(String), type: expect.any(String) } });
    expect((await validate(form({ "name.en": "" }, "save"))).ok).toBe(true);
    expect(await validate(form({ "name.en": "" }, "publish"))).toMatchObject({ ok: false, errors: { "name.en": "Enter the name in English" } });
  });

  it("checks each contact against its channel and reports at the row", async () => {
    const bad = await validate(form({ "contacts.1.channel": "email", "contacts.1.value": "nope", "contacts.2.channel": "website", "contacts.2.value": "not a site" }));
    expect(bad).toMatchObject({ ok: false, errors: { "contacts.1.value": expect.stringContaining("email"), "contacts.2.value": expect.any(String) } });
    const ok = await validate(form({ "contacts.1.channel": "website", "contacts.1.value": "example.com", "contacts.1.label.th": "ก", "contacts.1.label.en": "Site" }));
    expect(ok.ok && ok.data.contacts[1]).toEqual({ channel: "website", value: "https://example.com", label: { th: "ก", en: "Site" } });
  });

  it("drops untouched contact rows but keeps row numbers for errors", async () => {
    const result = await validate(form({ "contacts.1.channel": "instagram", "contacts.1.value": "", "contacts.2.channel": "phone", "contacts.2.value": "12" }));
    expect(result).toMatchObject({ ok: false, errors: { "contacts.2.value": expect.any(String) } });
  });

  it("rejects a taken slug except for the entry itself", async () => {
    const [row] = await db.insert(directoryOrganisations).values({ slug: "film-club", type: "club" }).returning();
    expect(await validate(form())).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
    expect((await validate(form(), { id: row!.id })).ok).toBe(true);
  });

  it("saves so that the public read returns what was edited", async () => {
    const checked = await validate(form({ "faculty.th": "คณะ", "faculty.en": "Faculty", "contacts.1.channel": "line", "contacts.1.value": "@filmclub" }, "publish"));
    if (!checked.ok) throw new Error("invalid");
    const d = checked.data;
    await saveContent({
      entityType: "organisation",
      table: directoryOrganisations,
      actor: { userId, context: { actorUserId: userId } },
      db,
      status: checked.status,
      values: { slug: d.slug, nameTh: d.name.th, nameEn: d.name.en, type: d.type, facultyTh: d.faculty.th, facultyEn: d.faculty.en, contacts: d.contacts, isActive: d.isActive },
    });
    const [org] = await readOrganisations(db);
    expect(org).toMatchObject({ slug: { current: "film-club" }, type: "club", faculty: { th: "คณะ", en: "Faculty" }, isActive: true });
    expect(org!.contacts.map((c) => [c.channel, c.value])).toEqual([["instagram", "film.club"], ["line", "@filmclub"]]);
  });
});
