/**
 * The public lost and found report Server Action against a real Postgres
 * (PGlite): sequential references, a draft row with the private columns, one
 * audit row, and no leak of the reporter's contact detail anywhere public.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const holder = vi.hoisted(() => ({ db: undefined as unknown, configured: true }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-request-id": "req-test-1" }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => holder.configured }));

import { auditLog, lostFoundItems, referenceCounters, places } from "@/lib/db/schema";
import { bangkokDateKey } from "@/lib/i18n/format";
import { getLostFoundItemBySlug, getLostFoundPage, getSearchIndex } from "@/lib/content";
import { submitLostFoundReport, type LostFoundReportState } from "@/app/[locale]/lost-and-found/report/actions";
import { createTestDb } from "../db/harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
const year = Number(bangkokDateKey().slice(0, 4));

beforeAll(async () => {
  ctx = await createTestDb();
  holder.db = ctx.db;
}, 60_000);
afterAll(async () => {
  await ctx.client.close();
});

const empty: LostFoundReportState = { errors: {}, values: {} as never };

function form(over: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    locale: "en",
    kind: "lost",
    title: "Blue umbrella",
    category: "umbrella",
    description: "Folding, blue, a bent rib",
    staffDetail: "Initials ST on the handle",
    place: "",
    locationNote: "Near the library steps",
    "occurredOn-day": "1",
    "occurredOn-month": "1",
    "occurredOn-year": String(year),
    contact: "line: somchai.t",
    website: "",
    renderedAt: new Date(Date.now() - 60_000).toISOString(),
    ...over,
  };
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

async function submit(data: FormData): Promise<{ redirectedTo?: string; state?: LostFoundReportState }> {
  try {
    return { state: await submitLostFoundReport(empty, data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("NEXT_REDIRECT:")) return { redirectedTo: message.slice("NEXT_REDIRECT:".length) };
    throw error;
  }
}

describe("submitLostFoundReport", () => {
  it("allocates sequential references and redirects to the confirmation page", async () => {
    const first = await submit(form());
    const second = await submit(form({ kind: "found", title: "Black wallet", category: "wallet" }));
    expect(first.redirectedTo).toBe(`/en/lost-and-found/report/received?ref=LF-${year}-0001`);
    expect(second.redirectedTo).toBe(`/en/lost-and-found/report/received?ref=LF-${year}-0002`);
    const [counter] = await ctx.db.select().from(referenceCounters).where(eq(referenceCounters.prefix, "LF"));
    expect(counter).toMatchObject({ year, lastValue: 2 });
  });

  it("writes a draft with the private columns, the lowercase reference as slug and the reporter's language", async () => {
    const [row] = await ctx.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, `LF-${year}-0001`));
    expect(row).toMatchObject({
      status: "draft",
      slug: `lf-${year}-0001`,
      kind: "lost",
      registerStatus: "open",
      submittedByStudent: true,
      category: "umbrella",
      titleEn: "Blue umbrella",
      titleTh: "",
      descriptionEn: "Folding, blue, a bent rib",
      locationNoteEn: "Near the library steps",
      occurredOn: `${year}-01-01`,
      submitterContact: "line: somchai.t",
      staffVerificationDetail: "Initials ST on the handle",
      placeId: null,
    });
    expect(row?.publishedAt).toBeNull();
  });

  it("writes Thai text to the Thai column", async () => {
    await submit(form({ locale: "th", title: "ร่มสีฟ้า", description: "ร่มพับ", locationNote: "หน้าห้องสมุด" }));
    const [row] = await ctx.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, `LF-${year}-0003`));
    expect(row).toMatchObject({ titleTh: "ร่มสีฟ้า", titleEn: "", descriptionTh: "ร่มพับ", locationNoteTh: "หน้าห้องสมุด", locationNoteEn: "" });
  });

  it("records one audit row per report, with no actor, the request id, and no contact detail", async () => {
    const rows = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "lost_found_item.report"));
    expect(rows).toHaveLength(3);
    const [item] = await ctx.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, `LF-${year}-0001`));
    const audit = rows.find((r) => r.entityId === item!.id)!;
    expect(audit).toMatchObject({ entityType: "lost_found_item", actorUserId: null, requestId: "req-test-1" });
    expect(audit.after).toEqual({ reference: `LF-${year}-0001`, kind: "lost", category: "umbrella", status: "draft" });
    expect(JSON.stringify(rows)).not.toContain("somchai");
  });

  it("stays invisible to readers until staff publish it", async () => {
    expect((await getLostFoundPage()).total).toBe(0);
    expect(await getLostFoundItemBySlug(`lf-${year}-0001`)).toBeNull();
    expect((await getSearchIndex()).records.some((r) => r.type === "lostFoundItem")).toBe(false);
  });

  it("links a place that exists", async () => {
    const [place] = await ctx.db.insert(places).values({ slug: "report-hall", nameEn: "Hall", category: "welfare" }).returning();
    await submit(form({ place: place!.id, locationNote: "" }));
    const [row] = await ctx.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, `LF-${year}-0004`));
    expect(row).toMatchObject({ placeId: place!.id, locationNoteEn: null });
  });

  it("returns field errors, uses no reference and writes nothing for invalid input", async () => {
    const before = await ctx.db.select().from(lostFoundItems);
    const bad = await submit(form({ title: "", category: "nope", "occurredOn-day": "31", "occurredOn-month": "4", contact: "", place: "", locationNote: "" }));
    expect(bad.state?.errors).toMatchObject({ title: expect.any(String), category: expect.any(String), occurredOn: expect.any(String), contact: expect.any(String), location: expect.any(String) });
    const notAPlace = await submit(form({ place: "'; drop table x; --", locationNote: "" }));
    expect(notAPlace.state?.errors.location).toBeTruthy();
    expect(await ctx.db.select().from(lostFoundItems)).toHaveLength(before.length);
    const [counter] = await ctx.db.select().from(referenceCounters).where(eq(referenceCounters.prefix, "LF"));
    expect(counter?.lastValue).toBe(4);
  });

  it("silently drops a honeypot or too-fast submission without issuing a reference", async () => {
    const trap = await submit(form({ website: "http://spam.example" }));
    const fast = await submit(form({ renderedAt: new Date().toISOString() }));
    expect(trap.redirectedTo).toBe("/en/lost-and-found/report/received");
    expect(fast.redirectedTo).toBe("/en/lost-and-found/report/received");
    expect(await ctx.db.select().from(lostFoundItems)).toHaveLength(4);
  });

  it("rolls the whole report back, giving the number back, when the insert fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // A well-formed place id that is not in the table passes validation and fails the foreign key.
    const failed = await submit(form({ place: "00000000-0000-4000-8000-000000000000", locationNote: "" }));
    expect(failed.state?.errors.form).toBeTruthy();
    expect(error.mock.calls[0]?.[0]).toBe("[lost-found] report not saved");
    error.mockRestore();
    const [counter] = await ctx.db.select().from(referenceCounters).where(eq(referenceCounters.prefix, "LF"));
    expect(counter?.lastValue).toBe(4);
    expect(await ctx.db.select().from(auditLog).where(eq(auditLog.action, "lost_found_item.report"))).toHaveLength(4);
    const next = await submit(form());
    expect(next.redirectedTo).toContain(`LF-${year}-0005`);
  });

  it("says the form is unavailable when there is no database", async () => {
    holder.configured = false;
    try {
      const result = await submit(form());
      expect(result.state?.errors.form).toBeTruthy();
    } finally {
      holder.configured = true;
    }
  });
});
