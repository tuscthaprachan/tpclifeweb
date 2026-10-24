import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { findFormUsages } from "@/app/admin/content/forms/usage";
import { validateFormRecordForm } from "@/app/admin/content/forms/validate";
import { formValues } from "@/app/admin/content/forms/values";
import { contentPageForms, contentPages, faqForms, faqs, forms, newsPosts } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => undefined, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent, deleteContent } = await import("@/lib/admin/content/save");
const { readFormBySlug } = await import("@/lib/content/forms");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const VALID: Record<string, string | string[]> = {
  slug: "emergency-report",
  "title.th": "แจ้งเหตุฉุกเฉิน",
  "title.en": "Emergency report",
  "purpose.th": "แจ้งเหตุ",
  "purpose.en": "Report an incident",
  "description.th": "",
  "description.en": "",
  category: "welfare",
  owner: "tusu",
  destinationType: "googleForm",
  destinationUrl: "https://forms.gle/abc",
  signInType: "",
  estimatedMinutes: "",
  deadline: "",
  lastVerified: "",
  isActive: "on",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validateFormRecordForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });
const actor = () => ({ userId, context: { actorUserId: userId } });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(contentPages);
  await db.delete(faqs);
  await db.delete(newsPosts);
  await db.delete(forms);
});

describe("validateFormRecordForm", () => {
  it("accepts a complete form and keeps the active flag on", async () => {
    expect(await validate(form({}, "publish"))).toMatchObject({
      ok: true,
      status: "published",
      data: { isActive: true, isPriority: false, requiresSignIn: false, prerequisites: [], contact: null },
    });
  });

  it("requires the text, category, owner and how it is completed; live forms need both languages", async () => {
    expect(await validate(form({ "title.th": "", "title.en": "", "purpose.th": "", "purpose.en": "", category: "", owner: "", destinationType: "" }))).toMatchObject({
      ok: false,
      errors: {
        "title.th": "Enter the title",
        "purpose.th": "Enter the purpose",
        category: "Select the category",
        owner: "Select the responsible body",
        destinationType: "Select the completion method",
      },
    });
    expect((await validate(form({ "title.en": "", "purpose.en": "" }))).ok).toBe(true);
    expect(await validate(form({ "title.en": "", "purpose.en": "" }, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "purpose.en": "Enter the purpose in English" },
    });
    expect(await validate(form({ "description.th": doc("x") }, "publish"))).toMatchObject({ ok: false, errors: { "description.en": expect.any(String) } });
  });

  it("checks the destination address against how the form is completed", async () => {
    expect(await validate(form({ destinationUrl: "not a url" }))).toMatchObject({ ok: false, errors: { destinationUrl: expect.stringContaining("correct format") } });
    expect(await validate(form({ destinationUrl: "" }, "publish"))).toMatchObject({ ok: false, errors: { destinationUrl: expect.stringContaining("Enter") } });
    expect((await validate(form({ destinationUrl: "" }, "save"))).ok).toBe(true);
    expect(await validate(form({ destinationType: "email", destinationUrl: "office@example.test" }))).toMatchObject({ ok: true, data: { destinationUrl: "office@example.test" } });
    expect(await validate(form({ destinationType: "email", destinationUrl: "https://x.test" }))).toMatchObject({ ok: false, errors: { destinationUrl: "Enter a real email address, like name@example.com" } });
    expect(await validate(form({ destinationType: "inPerson", destinationUrl: "https://x.test" }))).toMatchObject({ ok: true, data: { destinationUrl: null } });
  });

  it("clears the sign-in details when sign in is not required", async () => {
    const off = await validate(form({ signInType: "google", "signInNote.en": "Google only" }));
    expect(off).toMatchObject({ ok: true, data: { signInType: null, signInNote: { th: "", en: "" } } });
    const on = await validate(form({ requiresSignIn: "on", signInType: "google", "signInNote.en": "Google only" }));
    expect(on).toMatchObject({ ok: true, data: { requiresSignIn: true, signInType: "google", signInNote: { en: "Google only" } } });
    expect(await validate(form({ requiresSignIn: "on", signInType: "nobody" }))).toMatchObject({ ok: false, errors: { signInType: expect.any(String) } });
  });

  it("checks slug, minutes and dates", async () => {
    const [existing] = await db.insert(forms).values({ slug: "emergency-report", category: "welfare", owner: "tusu", destinationType: "inPerson" }).returning();
    expect(await validate(form())).toMatchObject({ ok: false, errors: { slug: "That web address name is already used. Try another" } });
    expect((await validate(form(), { id: existing!.id })).ok).toBe(true);
    expect(await validate(form({ estimatedMinutes: "0", deadline: "2026-13-01" }))).toMatchObject({
      ok: false,
      errors: { estimatedMinutes: expect.any(String), deadline: expect.any(String) },
    });
  });

  it("keeps the checklist and contact rows apart from their blanks", async () => {
    const result = await validate(
      form({
        "prerequisites.0.label.th": "",
        "prerequisites.0.label.en": "",
        "prerequisites.1.label.th": "บัตรนักศึกษา",
        "prerequisites.1.label.en": "Student card",
        "prerequisites.1.detail.en": "",
        "contact.value": "@tpc",
        "contact.channel": "line",
        "contact.label.th": "ไลน์",
        "contact.label.en": "LINE",
      }),
    );
    expect(result.ok && result.data.prerequisites).toEqual([null, expect.objectContaining({ label: { th: "บัตรนักศึกษา", en: "Student card" } })]);
    expect(await validate(form({ "contact.value": "@tpc" }))).toMatchObject({
      ok: false,
      errors: { "contact.channel": expect.any(String), "contact.label.th": "Enter the name of the contact" },
    });
  });

  it("round trips: a published edit is exactly what the public read returns", async () => {
    const checked = await validate(
      form(
        {
          "description.th": doc("รายละเอียด"),
          "description.en": doc("Detail"),
          "audience.th": "นักศึกษา",
          "audience.en": "Students",
          "prerequisites.0.label.th": "บัตร",
          "prerequisites.0.label.en": "Card",
          "prerequisites.0.detail.th": "ตัวจริง",
          "prerequisites.0.detail.en": "The original",
          requiresSignIn: "on",
          signInType: "google",
          "signInNote.th": "ต้องใช้ Google",
          "signInNote.en": "Google only",
          estimatedMinutes: "5",
          "turnaround.th": "3 วัน",
          "turnaround.en": "3 days",
          deadline: "2026-12-01",
          "contact.label.th": "ไลน์",
          "contact.label.en": "LINE",
          "contact.channel": "line",
          "contact.value": "@tpc",
          "contact.hours.th": "จันทร์-ศุกร์",
          "contact.hours.en": "Mon-Fri",
          isPriority: "on",
          lastVerified: "2026-10-01",
        },
        "publish",
      ),
    );
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
    const saved = await saveContent({ entityType: "form", table: forms, actor: actor(), db, status: checked.status, values: formValues(checked.data) });

    const read = await readFormBySlug(db, "emergency-report");
    expect(read).toMatchObject({
      _id: saved.id,
      title: { th: "แจ้งเหตุฉุกเฉิน", en: "Emergency report" },
      purpose: { en: "Report an incident" },
      audience: { th: "นักศึกษา", en: "Students" },
      prerequisites: [{ label: { th: "บัตร", en: "Card" }, detail: { th: "ตัวจริง", en: "The original" } }],
      requiresSignIn: true,
      signInType: "google",
      signInNote: { en: "Google only" },
      destinationType: "googleForm",
      destinationUrl: "https://forms.gle/abc",
      estimatedMinutes: 5,
      turnaround: { en: "3 days" },
      deadline: "2026-12-01",
      contact: { label: { en: "LINE" }, channel: "line", value: "@tpc", hours: { en: "Mon-Fri" } },
      isActive: true,
      isPriority: true,
      lastVerified: "2026-10-01",
    });
    expect(read!.description!.en.content).toHaveLength(1);

    const edit = await validate(form({ isActive: "", "description.th": "", "description.en": "" }), { id: saved.id, existingStatus: "published" });
    if (!edit.ok) throw new Error(JSON.stringify(edit.errors));
    await saveContent({ entityType: "form", table: forms, actor: actor(), db, id: saved.id, status: edit.status, values: formValues(edit.data) });
    const again = await readFormBySlug(db, "emergency-report");
    expect(again).toMatchObject({ isActive: false, requiresSignIn: false, contact: undefined, description: undefined, prerequisites: undefined });
  });
});

describe("findFormUsages", () => {
  const calloutDoc = (formId: string) => ({ type: "doc" as const, content: [{ type: "formCallout", attrs: { formId } }] });

  it("finds rich text callouts and related-form links, and the delete is refused by the caller", async () => {
    const [target] = await db.insert(forms).values({ slug: "t", category: "welfare", owner: "tusu", destinationType: "inPerson" }).returning();
    const [unused] = await db.insert(forms).values({ slug: "u", category: "welfare", owner: "tusu", destinationType: "inPerson" }).returning();
    expect(await findFormUsages(db, target!.id)).toEqual([]);

    const [news] = await db.insert(newsPosts).values({ slug: "n", owner: "tusu", titleEn: "News", bodyEn: calloutDoc(target!.id) as never }).returning();
    const [page] = await db.insert(contentPages).values({ kind: "welfare", slug: "p", category: "welfare", titleEn: "Page" }).returning();
    const [faq] = await db.insert(faqs).values({ category: "welfare", questionEn: "Q?" }).returning();
    await db.insert(contentPageForms).values({ pageId: page!.id, formId: target!.id, position: 0 });
    await db.insert(faqForms).values({ faqId: faq!.id, formId: target!.id, position: 0 });

    const usages = await findFormUsages(db, target!.id);
    expect(usages.map((u) => `${u.kind}:${u.id}`).sort()).toEqual([`news:${news!.id}`, `welfare:${page!.id}`, `faq:${faq!.id}`].sort());
    expect(await findFormUsages(db, unused!.id)).toEqual([]);

    // An unused form deletes cleanly.
    await deleteContent({ entityType: "form", table: forms, actor: actor(), db, id: unused!.id });
  });
});
