import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { validateNewsForm } from "@/app/admin/content/news/validate";
import { images, newsPosts } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const VALID: Record<string, string> = {
  slug: "freshers-week",
  "title.th": "สัปดาห์ต้อนรับ",
  "title.en": "Freshers week",
  "summary.th": "สรุป",
  "summary.en": "Summary",
  "body.th": doc("เนื้อหา"),
  "body.en": doc("Body"),
  owner: "tusu",
  category: "",
  publishedAt: "",
  cover: "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateNewsForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });

beforeAll(async () => {
  ({ db } = await createTestDb());
});

beforeEach(async () => {
  await db.delete(newsPosts);
  await db.delete(images);
});

describe("validateNewsForm", () => {
  it("accepts a complete post and returns the parsed values", async () => {
    const result = await validate(form({ publishedAt: "2026-10-23T09:00", category: "welfare" }, "publish"));
    expect(result).toMatchObject({
      ok: true,
      status: "published",
      publishing: true,
      data: { slug: "freshers-week", owner: "tusu", category: "welfare", publishedAt: new Date("2026-10-23T02:00:00Z"), gallery: [], tags: [] },
    });
  });

  it("lets a draft have one language, but not publish", async () => {
    const half = { "title.en": "", "summary.en": "", "body.en": "" };
    expect((await validate(form(half, "save"))).ok).toBe(true);
    const published = await validate(form(half, "publish"));
    expect(published).toMatchObject({
      ok: false,
      errors: {
        "title.en": "Enter the title in English",
        "summary.en": "Enter the summary in English",
        "body.en": "Enter the body in English",
      },
    });
  });

  it("applies the published rules when saving changes to a live post", async () => {
    const result = await validate(form({ "title.en": "" }, "save"), { existingStatus: "published" });
    expect(result).toMatchObject({ ok: false, errors: { "title.en": "Enter the title in English" } });
  });

  it("reports errors in Thai for a Thai-speaking editor", async () => {
    const result = await validate(form({ "title.th": "", "title.en": "" }, "save"), { locale: "th" });
    expect(result).toMatchObject({ ok: false, errors: { "title.th": expect.stringContaining("กรอก") } });
  });

  it("rejects rich text outside the vocabulary and says which field", async () => {
    const bad = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
    const result = await validate(form({ "body.th": bad }));
    expect(result).toMatchObject({ ok: false, errors: { "body.th": expect.stringContaining("cannot be saved") } });
    const script = JSON.stringify({ type: "doc", content: [{ type: "iframe" }] });
    expect(await validate(form({ "body.en": script }))).toMatchObject({ ok: false, errors: { "body.en": expect.stringContaining("cannot be saved") } });
  });

  it("checks slug format, uniqueness (ignoring the post itself) and the owner", async () => {
    expect(await validate(form({ slug: "Not A Slug" }))).toMatchObject({ ok: false, errors: { slug: expect.stringContaining("lower case") } });
    expect(await validate(form({ owner: "nobody" }))).toMatchObject({ ok: false, errors: { owner: "Select the responsible body" } });

    const [existing] = await db.insert(newsPosts).values({ slug: "freshers-week", owner: "tusc" }).returning();
    expect(await validate(form())).toMatchObject({ ok: false, errors: { slug: "That web address name is already used. Try another" } });
    expect((await validate(form(), { id: existing!.id })).ok).toBe(true);
  });

  it("parses tags, gallery and cover, and refuses unknown or undescribed pictures when publishing", async () => {
    const [described] = await db.insert(images).values({ storageKey: "content/images/a.jpg", altTh: "ก", altEn: "a" }).returning();
    const [bare] = await db.insert(images).values({ storageKey: "content/images/b.jpg" }).returning();
    const [decorative] = await db.insert(images).values({ storageKey: "content/images/c.jpg", isDecorative: true }).returning();

    const ok = await validate(
      form({ cover: described!.id, gallery: [described!.id, decorative!.id], "tags.0.th": "ก", "tags.0.en": "a", "tags.1.th": "", "tags.1.en": "" }, "publish"),
    );
    expect(ok).toMatchObject({ ok: true, data: { cover: described!.id, gallery: [described!.id, decorative!.id] } });
    expect(ok.ok && ok.data.tags).toHaveLength(2);

    expect(await validate(form({ cover: bare!.id }, "save"))).toMatchObject({ ok: true });
    expect(await validate(form({ cover: bare!.id }, "publish"))).toMatchObject({ ok: false, errors: { cover: expect.stringContaining("no description") } });
    expect(await validate(form({ gallery: [bare!.id] }, "publish"))).toMatchObject({ ok: false, errors: { gallery: expect.stringContaining("no description") } });
    expect(await validate(form({ cover: "00000000-0000-4000-8000-000000000000" }))).toMatchObject({ ok: false, errors: { cover: expect.any(String) } });
  });

  it("rejects an impossible publication date", async () => {
    expect(await validate(form({ publishedAt: "2026-02-31T10:00" }))).toMatchObject({ ok: false, errors: { publishedAt: expect.stringContaining("real date") } });
  });
});
