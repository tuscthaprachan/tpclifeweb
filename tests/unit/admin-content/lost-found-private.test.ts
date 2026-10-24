import { beforeAll, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => true }));

import { images, lostFoundItemPhotos, lostFoundItems } from "@/lib/db/schema";
import { readLostFoundItemByReference, readLostFoundItemBySlug, readLostFoundPage } from "@/lib/content/lost-found";
import { createMemoryStorage, setStorageForTests } from "@/lib/storage";
import { createTestDb } from "../db/harness";

const CONTACT = "SECRET-CONTACT-0812345678";
const DETAIL = "SECRET-DETAIL-scratch-on-lid";

let db: Awaited<ReturnType<typeof createTestDb>>["db"];

beforeAll(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  setStorageForTests(createMemoryStorage());
  const [photo] = await db.insert(images).values({ storageKey: "lf/a.jpg", altTh: "ก", altEn: "a" }).returning();
  const base = {
    titleTh: "ของ",
    titleEn: "Item",
    descriptionTh: "ก",
    descriptionEn: "Details",
    category: "keys" as const,
    owner: "tusc" as const,
    occurredOn: "2026-10-01",
    submitterContact: CONTACT,
    staffVerificationDetail: DETAIL,
  };
  const [live] = await db
    .insert(lostFoundItems)
    .values([
      { ...base, reference: "LF-2026-0001", slug: "lf-2026-0001", kind: "found", status: "published", publishedAt: new Date("2026-10-02T00:00:00Z"), heldAtEn: "TUSU desk" },
      { ...base, reference: "LF-2026-0002", slug: "lf-2026-0002", kind: "lost", status: "draft", submittedByStudent: true },
    ])
    .returning();
  await db.insert(lostFoundItemPhotos).values({ itemId: live!.id, imageId: photo!.id, position: 0 });
});

describe("the public lost and found reads", () => {
  it("never return the reporter's contact or the verification detail", async () => {
    const page = await readLostFoundPage(db);
    const bySlug = await readLostFoundItemBySlug(db, "lf-2026-0001");
    const byReference = await readLostFoundItemByReference(db, "lf-2026-0001");

    expect(page.total).toBe(1);
    expect(bySlug?.photos).toHaveLength(1);
    for (const output of [page, bySlug, byReference]) {
      const text = JSON.stringify(output);
      expect(text).not.toContain("SECRET-");
      expect(text).not.toMatch(/submitterContact|staffVerificationDetail/);
    }
  });

  it("do not return a report that is still waiting for approval", async () => {
    expect(await readLostFoundItemBySlug(db, "lf-2026-0002")).toBeNull();
    expect(await readLostFoundItemByReference(db, "LF-2026-0002")).toBeNull();
    expect((await readLostFoundPage(db)).items.map((i) => i.reference)).toEqual(["LF-2026-0001"]);
  });
});
