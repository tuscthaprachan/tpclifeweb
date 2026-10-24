import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { policyUpdateRows, policyValues, validatePolicyForm } from "@/app/admin/content/policies/validate";
import { policies, policyUpdates } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => true }));
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

const { saveContent } = await import("@/lib/admin/content/save");
const { readPolicyBySlug } = await import("@/lib/content/policies");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;

const VALID: Record<string, string> = {
  slug: "free-printing",
  "title.th": "พิมพ์งานฟรี",
  "title.en": "Free printing",
  "summary.th": "สรุป",
  "summary.en": "Summary",
  "detail.th": "",
  "detail.en": "",
  owner: "tusu",
  "area.th": "สวัสดิการ",
  "area.en": "Welfare",
  policyStatus: "inProgress",
  progress: "40",
  startedAt: "2026-08-01",
  targetDate: "2026-12-01",
  completedAt: "",
  oversightOf: "",
};
const form = (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
};
const validate = (formData: FormData, extra: { id?: string | null; existingStatus?: "draft" | "published"; locale?: "th" | "en" } = {}) =>
  validatePolicyForm(db, { locale: extra.locale ?? "en", id: extra.id ?? null, formData, existingStatus: extra.existingStatus });
const actor = () => ({ userId, context: { actorUserId: userId } });

/** Saves the way the Server Action does. */
async function save(formData: FormData, extra: { id?: string; existingStatus?: "draft" | "published" } = {}) {
  const checked = await validate(formData, { id: extra.id ?? null, existingStatus: extra.existingStatus });
  if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
  return saveContent({
    entityType: "policy",
    table: policies,
    actor: actor(),
    db,
    id: extra.id,
    status: checked.status,
    values: policyValues(checked.data),
    children: async (tx, policyId) => {
      await tx.delete(policyUpdates).where(eq(policyUpdates.policyId, policyId));
      const rows = policyUpdateRows(policyId, checked.data);
      if (rows.length > 0) await tx.insert(policyUpdates).values(rows);
      return { updates: rows };
    },
  });
}

const update = (n: number, o: Record<string, string> = {}) => ({
  [`updates.${n}.date`]: "2026-09-01",
  [`updates.${n}.status`]: "inProgress",
  [`updates.${n}.note.th`]: "เริ่มแล้ว",
  [`updates.${n}.note.en`]: "Started",
  [`updates.${n}.author.th`]: "",
  [`updates.${n}.author.en`]: "",
  [`updates.${n}.evidenceUrl`]: "",
  ...o,
});

beforeAll(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  userId = await makeUser(db);
});

beforeEach(async () => {
  await db.delete(policies);
});

describe("validatePolicyForm", () => {
  it("accepts a complete policy", async () => {
    expect(await validate(form({}, "publish"))).toMatchObject({
      ok: true,
      status: "published",
      data: { slug: "free-printing", owner: "tusu", policyStatus: "inProgress", progress: 40, startedAt: "2026-08-01", completedAt: null, evidence: [], updates: [] },
    });
  });

  it("needs the main fields, and both languages once published", async () => {
    expect(await validate(form({ "title.th": "", "title.en": "", owner: "", "area.th": "", "area.en": "" }))).toMatchObject({
      ok: false,
      errors: { "title.th": "Enter the title", owner: "Select the responsible body", "area.th": "Enter the policy area" },
    });
    const half = { "title.en": "", "area.en": "" };
    expect((await validate(form(half, "save"))).ok).toBe(true);
    expect(await validate(form(half, "publish"))).toMatchObject({
      ok: false,
      errors: { "title.en": "Enter the title in English", "area.en": "Enter the policy area in English" },
    });
  });

  it("limits progress to 0 to 100 and rejects an unknown status", async () => {
    expect(await validate(form({ progress: "101" }))).toMatchObject({ ok: false, errors: { progress: expect.any(String) } });
    expect(await validate(form({ progress: "-1" }))).toMatchObject({ ok: false, errors: { progress: expect.any(String) } });
    expect(await validate(form({ progress: "" }))).toMatchObject({ ok: true, data: { progress: null } });
    expect(await validate(form({ policyStatus: "done" }))).toMatchObject({ ok: false, errors: { policyStatus: expect.any(String) } });
  });

  it("keeps the target and completion dates from the start date", async () => {
    expect(await validate(form({ targetDate: "2026-07-31" }))).toMatchObject({
      ok: false,
      errors: { targetDate: "The target date must not be before the start date" },
    });
    expect(await validate(form({ completedAt: "2026-07-01" }))).toMatchObject({ ok: false, errors: { completedAt: expect.any(String) } });
    expect(await validate(form({ completedAt: "2026-02-30", startedAt: "" }))).toMatchObject({ ok: false, errors: { completedAt: expect.any(String) } });
  });

  it("checks the slug and the policy being scrutinised", async () => {
    const [target] = await db.insert(policies).values({ slug: "other", owner: "tusu" }).returning();
    expect(await validate(form())).toMatchObject({ ok: true });
    expect(await validate(form({ slug: "other" }))).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
    expect(await validate(form({ slug: "other" }), { id: target!.id })).toMatchObject({ ok: true });
    expect(await validate(form({ oversightOf: target!.id }))).toMatchObject({ ok: true, data: { oversightOf: target!.id } });
    expect(await validate(form({ oversightOf: target!.id }), { id: target!.id })).toMatchObject({ ok: false, errors: { oversightOf: expect.stringContaining("cannot scrutinise itself") } });
    expect(await validate(form({ oversightOf: "00000000-0000-4000-8000-000000000000" }))).toMatchObject({ ok: false, errors: { oversightOf: expect.any(String) } });
  });

  it("validates update rows where they sit, and skips blank rows without shifting the numbers", async () => {
    const blank = { "updates.0.date": "", "updates.0.status": "notStarted", "updates.0.note.th": "", "updates.0.note.en": "" };
    const result = await validate(form({ ...blank, ...update(1), ...update(2, { "updates.2.date": "", "updates.2.note.en": "" }) }, "publish"));
    expect(result).toMatchObject({
      ok: false,
      errors: { "updates.2.date": "Enter the date", "updates.2.note.en": "Enter the note in English" },
    });
    const ok = await validate(form({ ...blank, ...update(1), ...update(2, { "updates.2.evidenceUrl": "https://example.com/minutes" }) }, "publish"));
    expect(ok.ok && ok.data.updates).toHaveLength(2);
    expect(await validate(form({ ...update(0, { "updates.0.status": "" }) }))).toMatchObject({ ok: false, errors: { "updates.0.status": expect.any(String) } });
  });

  it("validates evidence links", async () => {
    const link = (n: number, o: Record<string, string> = {}) => ({
      [`evidence.${n}.label.th`]: "รายงาน",
      [`evidence.${n}.label.en`]: "Report",
      [`evidence.${n}.url`]: "https://example.com/report",
      [`evidence.${n}.description.th`]: "",
      [`evidence.${n}.description.en`]: "",
      ...o,
    });
    expect(await validate(form(link(0, { "evidence.0.url": "javascript:alert(1)" })))).toMatchObject({ ok: false, errors: { "evidence.0.url": expect.any(String) } });
    expect(await validate(form(link(0, { "evidence.0.url": "" })))).toMatchObject({ ok: false, errors: { "evidence.0.url": expect.any(String) } });
    expect(await validate(form(link(0, { "evidence.0.label.en": "" }), "publish"))).toMatchObject({ ok: false, errors: { "evidence.0.label.en": expect.any(String) } });
  });

  it("saves a published edit that the public read returns, with its updates and links", async () => {
    const created = await save(
      form(
        {
          ...update(0, { "updates.0.date": "2026-09-01" }),
          ...update(1, { "updates.1.date": "2026-10-01", "updates.1.status": "delivered", "updates.1.author.th": "ฝ่ายวิชาการ", "updates.1.author.en": "Academic team" }),
          "evidence.0.label.th": "รายงาน",
          "evidence.0.label.en": "Report",
          "evidence.0.url": "https://example.com/report",
          "evidence.0.description.th": "",
          "evidence.0.description.en": "",
          "evidence.0.requiresSignIn": "on",
        },
        "publish",
      ),
    );
    const found = await readPolicyBySlug(db, "free-printing");
    expect(found).toMatchObject({
      _id: created.id,
      title: { th: "พิมพ์งานฟรี", en: "Free printing" },
      policyArea: { en: "Welfare" },
      status: "inProgress",
      progressPercent: 40,
      startedAt: "2026-08-01",
      targetDate: "2026-12-01",
      completedAt: undefined,
      evidenceLinks: [{ label: { en: "Report" }, url: "https://example.com/report", requiresSignIn: true }],
    });
    expect(found?.updates?.map((u) => u.date)).toEqual(["2026-09-01", "2026-10-01"]);
    expect(found?.updates?.[1]).toMatchObject({ status: "delivered", author: { en: "Academic team" } });

    // Edit: drop the first update, change the status, clear the links.
    await save(form({ policyStatus: "delivered", progress: "100", completedAt: "2026-10-01", ...update(0, { "updates.0.date": "2026-10-01", "updates.0.status": "delivered" }) }, "save"), {
      id: created.id,
      existingStatus: "published",
    });
    const edited = await readPolicyBySlug(db, "free-printing");
    expect(edited).toMatchObject({ status: "delivered", progressPercent: 100, completedAt: "2026-10-01", evidenceLinks: undefined });
    expect(edited?.updates).toHaveLength(1);
    expect(await db.select().from(policyUpdates)).toHaveLength(1);
  });

  it("does not show a draft", async () => {
    await save(form({}, "save"));
    expect(await readPolicyBySlug(db, "free-printing")).toBeNull();
  });
});
