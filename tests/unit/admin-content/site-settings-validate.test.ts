import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isNavPath, validateSiteSettingsForm } from "@/app/admin/content/site-settings/validate";
import { siteSettings } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
const { saveContent } = await import("@/lib/admin/content/save");
const { readSiteSettings } = await import("@/lib/content/site");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string> = {
  "serviceName.th": "ชื่อ",
  "serviceName.en": "Name",
  "tagline.th": "คำอธิบาย",
  "tagline.en": "Tagline",
  phase: "beta",
  "primaryNav.0.label.th": "ข่าว",
  "primaryNav.0.label.en": "News",
  "primaryNav.0.path": "/news",
  "helpContacts.0.label.th": "อีเมล",
  "helpContacts.0.label.en": "Email us",
  "helpContacts.0.channel": "email",
  "helpContacts.0.value": "help@example.ac.th",
};
const form = (overrides: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, ...overrides })) fd.append(k, v);
  return fd;
};
const validate = (fd: FormData) => validateSiteSettingsForm({ locale: "en", formData: fd });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});
beforeEach(async () => {
  await db.delete(siteSettings);
});

describe("validateSiteSettingsForm", () => {
  it("accepts structured menus and contacts", async () => {
    const result = validate(
      form({
        "primaryNav.1.label.th": "หน้าแรก",
        "primaryNav.1.label.en": "Home",
        "primaryNav.1.path": "/",
        "organisationLinks.0.label.th": "ลิงก์",
        "organisationLinks.0.label.en": "Link",
        "organisationLinks.0.url": "https://example.com/x",
        "organisationLinks.0.requiresSignIn": "on",
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        phase: "beta",
        primaryNav: [{ label: { th: "ข่าว", en: "News" }, path: "/news" }, { label: { en: "Home" }, path: "/" }],
        helpContacts: [{ channel: "email", value: "help@example.ac.th" }],
        organisationLinks: [{ url: "https://example.com/x", requiresSignIn: true }],
      },
    });
  });

  it("requires both languages for the names and menu text", async () => {
    expect(validate(form({ "serviceName.en": "", "primaryNav.0.label.th": "" }))).toMatchObject({
      ok: false,
      errors: { "serviceName.en": "Enter the service name in English", "primaryNav.0.label.th": expect.any(String) },
    });
  });

  it("only allows site paths without a language prefix", () => {
    for (const ok of ["/", "/news", "/getting-around", "/guide/a-b"]) expect(isNavPath(ok)).toBe(true);
    for (const bad of ["news", "/th/news", "/en", "//x.com", "/news/", "https://x.com", "/a b"]) expect(isNavPath(bad)).toBe(false);
    expect(validate(form({ "primaryNav.0.path": "/th/news" }))).toMatchObject({ ok: false, errors: { "primaryNav.0.path": expect.any(String) } });
  });

  it("checks each help contact against its channel", () => {
    expect(validate(form({ "helpContacts.0.value": "nope" }))).toMatchObject({ ok: false, errors: { "helpContacts.0.value": expect.any(String) } });
    expect(validate(form({ "helpContacts.0.channel": "line", "helpContacts.0.value": "@abc" }))).toMatchObject({ ok: false, errors: { "helpContacts.0.value": expect.stringContaining("https://") } });
    expect(validate(form({ "helpContacts.0.channel": "inPerson", "helpContacts.0.value": "Room 1" })).ok).toBe(true);
    expect(validate(form({ "helpContacts.0.channel": "phone", "helpContacts.0.value": "02 613 3000" })).ok).toBe(true);
  });

  it("rejects an unknown phase", () => {
    expect(validate(form({ phase: "gamma" }))).toMatchObject({ ok: false, errors: { phase: expect.any(String) } });
  });

  it("creates then updates the one row, and the public read returns the edit", async () => {
    const save = async (overrides: Record<string, string>, id?: string) => {
      const checked = validate(form(overrides));
      if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
      const d = checked.data;
      return saveContent({
        entityType: "siteSettings",
        table: siteSettings,
        actor: { userId, context: { actorUserId: userId } },
        db,
        id,
        status: "published",
        values: { singletonKey: "site", serviceNameTh: d.serviceName.th, serviceNameEn: d.serviceName.en, taglineTh: d.tagline.th, taglineEn: d.tagline.en, phase: d.phase, primaryNav: d.primaryNav, footerNav: d.footerNav, helpContacts: d.helpContacts, organisationLinks: d.organisationLinks },
      });
    };
    const first = await save({});
    await save({ "serviceName.en": "Renamed", phase: "live" }, first.id);
    const settings = await readSiteSettings(db);
    expect(settings).toMatchObject({ serviceName: { en: "Renamed" }, phase: "live", primaryNav: [{ path: "/news" }], helpContacts: [{ channel: "email" }] });
    expect(await db.select().from(siteSettings)).toHaveLength(1);
  });
});
