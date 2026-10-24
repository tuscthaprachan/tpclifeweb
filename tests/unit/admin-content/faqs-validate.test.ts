import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validateFaqForm } from "@/app/admin/content/faqs/validate";
import { faqChildren, faqValues } from "@/app/admin/content/faqs/values";
import { faqForms, faqs, forms } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => undefined, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent } = await import("@/lib/admin/content/save");
const { readFaqs } = await import("@/lib/content/pages");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const VALID: Record<string, string | string[]> = {
  slug: "",
  "question.th": "ขอใบรับรองได้ที่ไหน",
  "question.en": "Where do I get a certificate?",
  "answer.th": doc("ที่สำนักงาน"),
  "answer.en": doc("At the office"),
  category: "welfare",
  sortOrder: "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published" } = {}) =>
  validateFaqForm(db, { locale: "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });
const actor = () => ({ userId, context: { actorUserId: userId } });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(faqs);
  await db.delete(forms);
});

describe("validateFaqForm", () => {
  it("accepts a complete FAQ with no anchor name", async () => {
    expect(await validate(form({ sortOrder: "4" }, "publish"))).toMatchObject({ ok: true, status: "published", data: { slug: null, sortOrder: 4, forms: [] } });
  });

  it("requires question, answer and category; a draft may have one language, a live FAQ both", async () => {
    expect(await validate(form({ "question.th": "", "question.en": "", "answer.th": "", "answer.en": "", category: "" }))).toMatchObject({
      ok: false,
      errors: { "question.th": "Enter the question", "answer.th": "Enter the answer", category: "Select the category" },
    });
    const half = { "question.en": "", "answer.en": "" };
    expect((await validate(form(half))).ok).toBe(true);
    expect(await validate(form(half, "publish"))).toMatchObject({
      ok: false,
      errors: { "question.en": "Enter the question in English", "answer.en": "Enter the answer in English" },
    });
    expect(await validate(form({ "question.en": "" }), { existingStatus: "published" })).toMatchObject({ ok: false });
  });

  it("checks the anchor name's format and uniqueness only when one is typed", async () => {
    expect(await validate(form({ slug: "Bad Slug" }))).toMatchObject({ ok: false, errors: { slug: expect.stringContaining("lower case") } });
    const [existing] = await db.insert(faqs).values({ slug: "certificate", category: "welfare" }).returning();
    expect(await validate(form({ slug: "certificate" }))).toMatchObject({ ok: false, errors: { slug: "That web address name is already used. Try another" } });
    expect((await validate(form({ slug: "certificate" }), { id: existing!.id })).ok).toBe(true);
    await db.insert(faqs).values({ category: "welfare" });
    expect((await validate(form())).ok).toBe(true);
  });

  it("rejects unknown related forms", async () => {
    expect(await validate(form({ forms: ["00000000-0000-4000-8000-000000000000"] }))).toMatchObject({ ok: false, errors: { forms: expect.any(String) } });
  });

  it("round trips: a published edit is exactly what the public read returns", async () => {
    const [f1] = await db.insert(forms).values({ slug: "f1", category: "welfare", owner: "tusu", destinationType: "inPerson", status: "published", titleEn: "F1", titleTh: "ฟ1" }).returning();
    const [f2] = await db.insert(forms).values({ slug: "f2", category: "welfare", owner: "tusu", destinationType: "inPerson", status: "published", titleEn: "F2", titleTh: "ฟ2" }).returning();

    const checked = await validate(form({ slug: "certificate", sortOrder: "1", forms: [f2!.id, f1!.id] }, "publish"));
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
    const saved = await saveContent({
      entityType: "faq",
      table: faqs,
      actor: actor(),
      db,
      status: checked.status,
      values: faqValues(checked.data),
      children: faqChildren(checked.data),
    });

    const [read] = await readFaqs(db);
    expect(read).toMatchObject({ _id: saved.id, question: { th: "ขอใบรับรองได้ที่ไหน", en: "Where do I get a certificate?" }, category: "welfare", order: 1 });
    expect(read!.relatedForms!.map((f) => f.slug.current)).toEqual(["f2", "f1"]);

    const edit = await validate(form({ "question.en": "How do I get a certificate?", forms: [f1!.id] }), { id: saved.id, existingStatus: "published" });
    if (!edit.ok) throw new Error(JSON.stringify(edit.errors));
    await saveContent({
      entityType: "faq",
      table: faqs,
      actor: actor(),
      db,
      id: saved.id,
      status: edit.status,
      values: faqValues(edit.data),
      children: faqChildren(edit.data),
    });
    const [again] = await readFaqs(db);
    expect(again).toMatchObject({ question: { en: "How do I get a certificate?" }, order: undefined });
    expect(again!.relatedForms!.map((f) => f.slug.current)).toEqual(["f1"]);
    expect(await db.select().from(faqForms)).toHaveLength(1);
  });
});
