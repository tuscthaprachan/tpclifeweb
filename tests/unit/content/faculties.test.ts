/**
 * The faculties content type: the seed (faculties, the committee links and
 * their scope), the reader the issue reporting service uses, and the admin
 * form's validation. PGlite with the real migrations.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => undefined, isDatabaseConfigured: () => true }));

import { validateFacultyForm } from "@/app/admin/content/faculties/validate";
import { readFacultiesWithOrganisations, readFacultyById } from "@/lib/content/faculties";
import { directoryOrganisations, faculties } from "@/lib/db/schema";
import { seedDirectory } from "@/lib/db/seed/directory";
import { buildFaculties, FACULTY_LINKS, seedFaculties } from "@/lib/db/seed/faculties";
import { createTestDb } from "../db/harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  ctx = await createTestDb();
  await seedFaculties(ctx.db);
  await seedDirectory(ctx.db);
}, 120_000);
afterAll(async () => {
  await ctx.client.close();
});

const bySlug = async (slug: string) => (await readFacultiesWithOrganisations(ctx.db)).find((f) => f.slug === slug)!;

describe("seed", () => {
  it("seeds every faculty and college on the harvested organisations, names verbatim, offices blank", async () => {
    const rows = await ctx.db.select().from(faculties);
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.nameEn).sort()).toEqual(buildFaculties().map((f) => f.name.en).sort());
    expect(rows.find((r) => r.slug === "social-administration")!.nameTh).toBe("คณะสังคมสงเคราะห์ศาษตร์");
    for (const row of rows) {
      expect(row.status).toBe("published");
      expect([row.officeLocationTh, row.officeLocationEn, row.officePhone, row.officeEmail, row.officeWebsite, row.officeNoteTh, row.officeNoteEn]).toEqual(Array(7).fill(null));
    }
  });

  it("links every faculty committee to a faculty, and nothing else", async () => {
    const committees = await ctx.db.select().from(directoryOrganisations).where(eq(directoryOrganisations.type, "facultyCommittee"));
    for (const org of committees) {
      expect(org.facultyId, org.slug).not.toBeNull();
      expect(org.scope, org.slug).not.toBeNull();
    }
    const others = (await ctx.db.select().from(directoryOrganisations)).filter((o) => o.type !== "facultyCommittee");
    expect(others.every((o) => o.facultyId === null && o.scope === null)).toBe(true);
    expect(committees.filter((o) => o.scope === "programme").every((o) => o.programmeNameEn && o.programmeNameTh)).toBe(true);
    expect(Object.keys(FACULTY_LINKS)).toHaveLength(committees.length);
  });

  it("runs again without clobbering an editor's office details, order, link or scope", async () => {
    const [liberal] = await ctx.db.select().from(faculties).where(eq(faculties.slug, "liberal-arts"));
    await ctx.db.update(faculties).set({ officePhone: "02 000 0000", sortOrder: 99 }).where(eq(faculties.id, liberal!.id));
    await ctx.db.update(directoryOrganisations).set({ scope: "programme" }).where(eq(directoryOrganisations.slug, "liberal-arts-student-council-tha-prachan"));
    await seedFaculties(ctx.db);
    await seedDirectory(ctx.db);
    const [after] = await ctx.db.select().from(faculties).where(eq(faculties.id, liberal!.id));
    expect(after).toMatchObject({ officePhone: "02 000 0000", sortOrder: 99 });
    const [org] = await ctx.db.select().from(directoryOrganisations).where(eq(directoryOrganisations.slug, "liberal-arts-student-council-tha-prachan"));
    expect(org!.scope).toBe("programme");
    await ctx.db.update(faculties).set({ officePhone: null, sortOrder: 10 }).where(eq(faculties.id, liberal!.id));
    await ctx.db.update(directoryOrganisations).set({ scope: "faculty" }).where(eq(directoryOrganisations.slug, "liberal-arts-student-council-tha-prachan"));
  });
});

describe("getFacultiesWithOrganisations", () => {
  it("lists published faculties in their set order", async () => {
    const list = await readFacultiesWithOrganisations(ctx.db);
    expect(list.map((f) => f.slug)).toEqual(buildFaculties().map((f) => f.slug));
  });

  it("splits Liberal Arts into its faculty-wide council and six programme associations with their Instagram contacts", async () => {
    const liberal = await bySlug("liberal-arts");
    expect(liberal.councils.map((b) => b.name.en)).toEqual(["Liberal Arts Student Council Tha Prachan"]);
    expect(liberal.councils[0]!.contacts).toEqual([expect.objectContaining({ channel: "instagram", value: "basictpc", _key: "0" })]);
    expect(liberal.programmes).toHaveLength(6);
    expect(liberal.programmes.every((b) => b.scope === "programme" && b.programme?.th && b.programme.en)).toBe(true);
    expect(liberal.programmes.map((b) => b.name.en)).toContain("Korean Studies Student Association");
  });

  it("treats a faculty's only committee as faculty-wide unless it is a programme", async () => {
    expect((await bySlug("social-administration")).councils.map((b) => b.name.en)).toEqual(["SPD Inter Student Council"]);
    expect((await bySlug("college-of-innovation")).councils).toHaveLength(1);
    const law = await bySlug("law");
    expect(law.councils).toEqual([]);
    expect(law.programmes.map((b) => b.name.en)).toEqual(["LL.B. Student Committee"]);
  });

  it("returns blank office details as absent, and reports hasOffice", async () => {
    const economics = await bySlug("economics");
    expect(economics.office).toEqual({});
    expect(economics.hasOffice).toBe(false);
    await ctx.db
      .update(faculties)
      .set({ officeLocationTh: "ชั้น 1", officeLocationEn: "Floor 1", officePhone: "02 111 1111", officeNoteEn: "Weekdays 9 to 4" })
      .where(eq(faculties.slug, "economics"));
    const filled = await bySlug("economics");
    expect(filled.hasOffice).toBe(true);
    expect(filled.office).toEqual({ location: { th: "ชั้น 1", en: "Floor 1" }, phone: "02 111 1111", note: { th: "", en: "Weekdays 9 to 4" } });
  });

  it("leaves out drafts, inactive committees and committees with no scope are faculty-wide", async () => {
    await ctx.db.update(directoryOrganisations).set({ isActive: false }).where(eq(directoryOrganisations.slug, "bba-tu"));
    await ctx.db.update(directoryOrganisations).set({ scope: null }).where(eq(directoryOrganisations.slug, "ibmp-tu"));
    const commerce = await bySlug("commerce-and-accountancy");
    expect(commerce.programmes).toEqual([]);
    expect(commerce.councils.map((b) => b.name.en)).toEqual(["IBMP TU"]);
    await ctx.db.update(directoryOrganisations).set({ isActive: true, scope: "programme" }).where(eq(directoryOrganisations.type, "facultyCommittee"));

    await ctx.db.update(faculties).set({ status: "draft" }).where(eq(faculties.slug, "law"));
    expect((await readFacultiesWithOrganisations(ctx.db)).map((f) => f.slug)).not.toContain("law");
    const [law] = await ctx.db.select().from(faculties).where(eq(faculties.slug, "law"));
    expect(await readFacultyById(ctx.db, law!.id)).toBeUndefined();
    await ctx.db.update(faculties).set({ status: "published" }).where(eq(faculties.slug, "law"));
    expect((await readFacultyById(ctx.db, law!.id))?.programmes).toHaveLength(1);
  });
});

describe("validateFacultyForm", () => {
  const form = (overrides: Record<string, string> = {}, intent = "save") => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ slug: "faculty-of-arts", "name.th": "คณะศิลปะ", "name.en": "Faculty of Arts", sortOrder: "5", intent, ...overrides })) fd.append(k, v);
    return fd;
  };
  const validate = (formData: FormData) => validateFacultyForm(ctx.db, { locale: "en", id: null, formData });

  it("accepts a faculty with a blank office", async () => {
    expect(await validate(form())).toMatchObject({ ok: true, data: { slug: "faculty-of-arts", sortOrder: 5, phone: null, email: null, website: null } });
  });

  it("checks the phone, email and website when they are given", async () => {
    const bad = await validate(form({ phone: "abc", email: "nope", website: "not a link" }));
    expect(bad).toMatchObject({ ok: false, errors: { phone: expect.any(String), email: expect.any(String), website: expect.any(String) } });
    const good = await validate(form({ phone: "02 613 3000", email: "office@example.ac.th", website: "https://example.ac.th" }));
    expect(good).toMatchObject({ ok: true, data: { phone: "02 613 3000", email: "office@example.ac.th", website: "https://example.ac.th" } });
  });

  it("refuses a slug that is taken", async () => {
    expect(await validate(form({ slug: "law" }))).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
  });
});
