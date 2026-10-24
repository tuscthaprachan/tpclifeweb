import { and, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, contentRevisions, images, lostFoundItemPhotos, lostFoundItems, lostFoundPublic, referenceCounters } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { saveLostFoundItem } = await import("@/app/admin/content/lost-and-found/service");
const { validateLostFoundForm } = await import("@/app/admin/content/lost-and-found/validate");
const { deleteContent } = await import("@/lib/admin/content/save");
const { auditedLostFoundItems } = await import("@/app/admin/content/lost-and-found/service");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });
const NOW = new Date("2026-10-23T05:00:00Z");
const CONTACT = "SECRET-CONTACT-0812345678";
const DETAIL = "SECRET-DETAIL-scratch-on-lid";

const VALID: Record<string, string | string[]> = {
  kind: "found",
  "title.th": "กุญแจ",
  "title.en": "Keys",
  "description.th": "พวงกุญแจสีแดง",
  "description.en": "A red keyring",
  category: "keys",
  "locationNote.th": "หน้าห้องสมุด",
  "locationNote.en": "Outside the library",
  occurredOn: "2026-10-20",
  registerStatus: "open",
  owner: "tusc",
  submitterContact: CONTACT,
  staffVerificationDetail: DETAIL,
};
const validated = async (overrides: Record<string, string | string[]> = {}, intent = "save") => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  const result = await validateLostFoundForm(db, { locale: "en", formData: fd });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
};

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(lostFoundItems);
  await db.delete(images);
  await db.delete(contentRevisions);
  await db.delete(referenceCounters);
});

describe("saveLostFoundItem", () => {
  it("creates a listing with the next reference, then edits, publishes and deletes it", async () => {
    const [photo] = await db.insert(images).values({ storageKey: "lf/a.jpg", altTh: "ก", altEn: "a" }).returning();

    const first = await validated({ photos: [photo!.id] });
    const created = await saveLostFoundItem(db, { actor: actor(), status: first.status, data: first.data, now: NOW });
    expect(created.created).toBe(true);
    expect(created.row).toMatchObject({ reference: "LF-2026-0001", slug: "lf-2026-0001", status: "draft", titleEn: "Keys", createdBy: userId });
    expect(await db.select().from(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, created.id))).toHaveLength(1);
    expect(revalidateFor).toHaveBeenCalledWith("lostFoundItem", "lf-2026-0001");

    // The second listing takes the next number.
    const second = await saveLostFoundItem(db, { actor: actor(), data: first.data, now: NOW });
    expect(second.row.reference).toBe("LF-2026-0002");

    // Edit and publish; the reference stays put.
    const edit = await validated({ "title.en": "Red keys", registerStatus: "matched", photos: [] }, "publish");
    const updated = await saveLostFoundItem(db, { actor: actor(), id: created.id, status: edit.status, data: edit.data, now: NOW });
    expect(updated.created).toBe(false);
    expect(updated.row).toMatchObject({ reference: "LF-2026-0001", status: "published", titleEn: "Red keys", registerStatus: "matched" });
    expect(updated.row.publishedAt).toEqual(NOW);
    expect(await db.select().from(lostFoundItemPhotos).where(eq(lostFoundItemPhotos.itemId, created.id))).toHaveLength(0);

    // The public view now has it, without the private columns.
    const [live] = await db.select().from(lostFoundPublic).where(eq(lostFoundPublic.id, created.id));
    expect(live).toMatchObject({ titleEn: "Red keys", registerStatus: "matched" });
    expect(Object.keys(live!)).not.toContain("submitterContact");

    await deleteContent({ entityType: "lostFoundItem", table: auditedLostFoundItems, actor: actor(), db, id: created.id });
    expect(await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, created.id))).toHaveLength(0);
  });

  it("stores the private fields but keeps them out of the audit log and the revision history", async () => {
    const data = await validated();
    const { id } = await saveLostFoundItem(db, { actor: actor(), data: data.data, now: NOW });
    const edit = await validated({ staffVerificationDetail: `${DETAIL} changed` });
    await saveLostFoundItem(db, { actor: actor(), id, data: edit.data, now: NOW });

    const [stored] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, id));
    expect(stored).toMatchObject({ submitterContact: CONTACT, staffVerificationDetail: `${DETAIL} changed` });

    const trail = JSON.stringify([await db.select().from(auditLog), await db.select().from(contentRevisions)]);
    expect(trail).not.toContain("SECRET-");
    const privateEdits = await db.select().from(auditLog).where(and(eq(auditLog.action, "lost_found_items.private_update"), eq(auditLog.entityId, id)));
    expect(privateEdits.map((e) => e.after)).toEqual([{ changed: ["submitterContact", "staffVerificationDetail"] }, { changed: ["staffVerificationDetail"] }]);
  });
});
