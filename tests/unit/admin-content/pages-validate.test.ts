import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validatePageForm } from "@/app/admin/content/_pages/validate";
import { pageChildren, pageValues } from "@/app/admin/content/_pages/values";
import { contentPageForms, contentPageRelated, contentPages, forms } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => undefined, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent } = await import("@/lib/admin/content/save");
const { readTopicPageBySlug } = await import("@/lib/content/pages");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const VALID: Record<string, string | string[]> = {
  section: "health",
  userNeed: "A student who feels low and does not know who to ask",
  slug: "mental-health",
  "title.th": "สุขภาพใจ",
  "title.en": "Mental health",
  "summary.th": "สรุป",
  "summary.en": "Summary",
  "body.th": doc("เนื้อหา"),
  "body.en": doc("Body"),
  category: "welfare",
  sortOrder: "",
  lastReviewed: "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
type Extra = { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" };
const validate = (formData: FormData, e: Extra = {}) =>
  validatePageForm(db, { locale: e.locale ?? "en", id: e.id ?? null, formData, existingStatus: e.existingStatus });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(contentPages);
  await db.delete(forms);
});

describe("validatePageForm", () => {
  it("accepts a complete page and returns the parsed values", async () => {
    const result = await validate(form({ sortOrder: "3", lastReviewed: "2026-09-01" }, "publish"));
    expect(result).toMatchObject({
      ok: true,
      status: "published",
      data: { section: "health", userNeed: "A student who feels low and does not know who to ask", slug: "mental-health", category: "welfare", sortOrder: 3, lastReviewed: "2026-09-01", forms: [], related: [], links: [] },
    });
  });

  it("requires the text and a category, but lets a draft have one language", async () => {
    expect(await validate(form({ "title.th": "", "title.en": "", category: "" }))).toMatchObject({
      ok: false,
      errors: { "title.th": "Enter the title", category: "Select the category" },
    });
    const half = { "title.en": "", "summary.en": "", "body.en": "" };
    expect((await validate(form(half, "save"))).ok).toBe(true);
    expect(await validate(form(half, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "summary.en": "Enter the summary in English", "body.en": "Enter the body in English" },
    });
  });

  it("applies the published rules when saving changes to a live page", async () => {
    expect(await validate(form({ "summary.en": "" }), { existingStatus: "published" })).toMatchObject({ ok: false, errors: { "summary.en": "Enter the summary in English" } });
  });

  it("requires a known section", async () => {
    expect(await validate(form({ section: "" }))).toMatchObject({ ok: false, errors: { section: "Select the section" } });
    expect(await validate(form({ section: "welfare" }))).toMatchObject({ ok: false, errors: { section: "Select the section" } });
    expect(await validate(form({ section: "guide" }))).toMatchObject({ ok: false, errors: { section: "Select the section" } });
    for (const section of ["start", "campus", "study", "health", "money", "help", "say"]) {
      expect(await validate(form({ section }))).toMatchObject({ ok: true, data: { section } });
    }
  });

  it("treats the user need as optional text for staff", async () => {
    expect(await validate(form({ userNeed: "" }, "publish"))).toMatchObject({ ok: true, data: { userNeed: "" } });
    expect(await validate(form({ userNeed: "x".repeat(1001) }))).toMatchObject({ ok: false, errors: { userNeed: expect.any(String) } });
  });

  it("keeps slugs unique across every section, and lets a page keep its own", async () => {
    const [existing] = await db.insert(contentPages).values({ section: "health", slug: "mental-health", category: "welfare" }).returning();
    expect(await validate(form())).toMatchObject({ ok: false, errors: { slug: "That web address ending is already used. Try another" } });
    expect((await validate(form(), { id: existing!.id })).ok).toBe(true);
    expect(await validate(form({ section: "money" }))).toMatchObject({ ok: false, errors: { slug: "That web address ending is already used. Try another" } });
    expect(await validate(form({ slug: "Not A Slug" }))).toMatchObject({ ok: false, errors: { slug: expect.stringContaining("lower case") } });
  });

  it("checks the order, review date and related forms and pages", async () => {
    expect(await validate(form({ sortOrder: "-1", lastReviewed: "2026-02-31" }))).toMatchObject({
      ok: false,
      errors: { sortOrder: expect.any(String), lastReviewed: expect.any(String) },
    });
    const none = "00000000-0000-4000-8000-000000000000";
    expect(await validate(form({ forms: [none] }))).toMatchObject({ ok: false, errors: { forms: expect.any(String) } });
    expect(await validate(form({ related: [none] }))).toMatchObject({ ok: false, errors: { related: expect.any(String) } });
    const [self] = await db.insert(contentPages).values({ section: "health", slug: "self", category: "welfare" }).returning();
    expect(await validate(form({ related: [self!.id] }), { id: self!.id })).toMatchObject({ ok: false, errors: { related: "A page cannot be related to itself" } });
  });

  it("reports an error in the row it belongs to and drops blank link rows", async () => {
    const result = await validate(
      form({
        "links.0.label.th": "",
        "links.0.label.en": "",
        "links.0.url": "",
        "links.0.description.th": "",
        "links.0.description.en": "",
        "links.1.label.th": "ศูนย์",
        "links.1.label.en": "Centre",
        "links.1.url": "javascript:alert(1)",
      }),
    );
    expect(result).toMatchObject({ ok: false, errors: { "links.1.url": expect.stringContaining("correct format") } });
    expect(await validate(form({ "links.0.label.en": "Centre", "links.0.url": "https://example.com", "links.0.description.en": "Open" }, "publish"))).toMatchObject({
      ok: false,
      errors: { "links.0.label.th": "Enter the link name in Thai", "links.0.description.th": "Enter the short description in Thai" },
    });
    const ok = await validate(form({ "links.0.label.th": "", "links.0.url": "", "links.1.label.en": "Centre", "links.1.url": "https://example.com/a", "links.1.requiresSignIn": "on" }));
    expect(ok.ok && ok.data.links).toEqual([null, expect.objectContaining({ url: "https://example.com/a", requiresSignIn: true })]);
  });

  it("round trips: a published edit is exactly what the public read returns", async () => {
    const [a1] = await db.insert(forms).values({ slug: "f1", category: "welfare", owner: "tusu", destinationType: "inPerson", status: "published", titleEn: "F1", titleTh: "ฟ1" }).returning();
    const [a2] = await db.insert(forms).values({ slug: "f2", category: "welfare", owner: "tusu", destinationType: "inPerson", status: "published", titleEn: "F2", titleTh: "ฟ2" }).returning();
    const [other] = await db.insert(contentPages).values({ section: "money", slug: "other", category: "welfare", status: "published", titleEn: "Other", titleTh: "อื่น" }).returning();

    const checked = await validate(
      form(
        {
          sortOrder: "2",
          lastReviewed: "2026-09-01",
          forms: [a2!.id, a1!.id],
          related: [other!.id],
          "links.0.label.th": "ศูนย์",
          "links.0.label.en": "Centre",
          "links.0.url": "https://example.com/centre",
          "links.0.description.th": "เปิดวันธรรมดา",
          "links.0.description.en": "Open weekdays",
        },
        "publish",
      ),
    );
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
    const saved = await saveContent({
      entityType: "topicPage",
      table: contentPages,
      actor: { userId, context: { actorUserId: userId } },
      db,
      status: checked.status,
      values: pageValues(checked.data),
      children: pageChildren(checked.data),
    });

    const read = await readTopicPageBySlug(db, "mental-health");
    expect(read).toMatchObject({
      _id: saved.id,
      _type: "topicPage",
      section: "health",
      title: { th: "สุขภาพใจ", en: "Mental health" },
      category: "welfare",
      order: 2,
      lastReviewed: "2026-09-01",
      relatedLinks: [{ label: { th: "ศูนย์", en: "Centre" }, url: "https://example.com/centre", description: { th: "เปิดวันธรรมดา", en: "Open weekdays" } }],
    });
    expect(read!.relatedForms!.map((f) => f.slug.current)).toEqual(["f2", "f1"]);
    expect(read!.relatedPages!.map((p) => p.slug.current)).toEqual(["other"]);

    // Editing replaces the related rows rather than adding to them.
    const edit = await validate(form({ forms: [a1!.id], "title.en": "Mental wellbeing" }, "save"), { id: saved.id, existingStatus: "published" });
    if (!edit.ok) throw new Error(JSON.stringify(edit.errors));
    await saveContent({
      entityType: "topicPage",
      table: contentPages,
      actor: { userId, context: { actorUserId: userId } },
      db,
      id: saved.id,
      status: edit.status,
      values: pageValues(edit.data),
      children: pageChildren(edit.data),
    });
    const again = await readTopicPageBySlug(db, "mental-health");
    expect(again).toMatchObject({ title: { en: "Mental wellbeing" } });
    expect(again!.relatedForms!.map((f) => f.slug.current)).toEqual(["f1"]);
    expect(again!.relatedPages).toBeUndefined();
    expect(again!.relatedLinks).toBeUndefined();
    expect(await db.select().from(contentPageForms)).toHaveLength(1);
    expect(await db.select().from(contentPageRelated)).toHaveLength(0);
  });
});
