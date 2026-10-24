import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { planPrice, recordPrice } from "@/app/admin/content/canteen-dishes/price";
import { stallPriceSheet, updateStallPrices } from "@/app/admin/content/canteen-stalls/prices";
import { auditLog, canteenDishes, canteenDishPriceHistory, canteenDishVariants, canteenSettings, canteenStalls, contentRevisions } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { saveContent } = await import("@/lib/admin/content/save");

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let userId: string;
let stallId: string;
const actor = () => ({ userId, context: { actorUserId: userId, ip: "203.0.113.9" } });

/** Saves a dish the way the Server Action does: row, variants and price history in one transaction. */
async function saveDish(values: Record<string, unknown> & { price: number; checkedOn: string }, id?: string, today = "2026-10-23") {
  const [before] = id ? await db.select().from(canteenDishes).where(eq(canteenDishes.id, id)) : [];
  const plan = planPrice(before, values, today);
  return saveContent({
    entityType: "canteenDish",
    table: canteenDishes,
    actor: actor(),
    db,
    id,
    status: "published",
    values: { slug: "17-thai-tea", nameTh: "ชาไทย", nameEn: "Thai tea", stallId, type: "drink", course: "drink", protein: ["none"], ...values, checkedOn: plan.checkedOn },
    children: async (tx, dishId) => {
      await tx.delete(canteenDishVariants).where(eq(canteenDishVariants.dishId, dishId));
      await tx.insert(canteenDishVariants).values({ dishId, position: 0, labelTh: "พิเศษ", labelEn: "Special", delta: 10 });
      return { priceHistory: plan.record ? [await recordPrice(tx, dishId, values.price, plan.checkedOn)] : [] };
    },
  });
}

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(canteenDishes);
  await db.delete(canteenStalls);
  await db.delete(canteenSettings);
  const [stall] = await db.insert(canteenStalls).values({ slug: "17-am-tea", nameTh: "แอมที", nameEn: "Am Tea", number: 17, mapCol: 10, mapRow: 0, status: "published" }).returning();
  stallId = stall!.id;
});

const history = (dishId: string) => db.select().from(canteenDishPriceHistory).where(eq(canteenDishPriceHistory.dishId, dishId)).orderBy(canteenDishPriceHistory.checkedOn);

describe("dish price history", () => {
  it("starts a history with a new dish and appends when the price changes, keeping the old price", async () => {
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    expect(await history(id)).toMatchObject([{ price: 25, checkedOn: "2026-10-21" }]);

    await saveDish({ price: 30, checkedOn: "2026-10-21" }, id);
    expect(await history(id)).toMatchObject([
      { price: 25, checkedOn: "2026-10-21" },
      { price: 30, checkedOn: "2026-10-23" },
    ]);
    const [row] = await db.select().from(canteenDishes).where(eq(canteenDishes.id, id));
    expect(row).toMatchObject({ price: 30, checkedOn: "2026-10-23" });
  });

  it("adds nothing when a save changes neither the price nor the check date", async () => {
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    await saveDish({ price: 25, checkedOn: "2026-10-21", nameEn: "Thai milk tea" }, id);
    expect(await history(id)).toHaveLength(1);
  });

  it("records a re-check of an unchanged price, and corrects a same-day entry instead of duplicating it", async () => {
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    await saveDish({ price: 25, checkedOn: "2026-10-22" }, id);
    await saveDish({ price: 28, checkedOn: "2026-10-22" }, id);
    await saveDish({ price: 29, checkedOn: "2026-10-23" }, id);
    await saveDish({ price: 31, checkedOn: "2026-10-23" }, id);
    expect(await history(id)).toMatchObject([
      { price: 25, checkedOn: "2026-10-21" },
      { price: 25, checkedOn: "2026-10-22" },
      { price: 31, checkedOn: "2026-10-23" },
    ]);
  });

  it("puts the history in the revision, and the audit entry beside it", async () => {
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    const [revision] = await db.select().from(contentRevisions).where(eq(contentRevisions.entityId, id));
    expect((revision!.revision as { priceHistory: { price: number }[] }).priceHistory[0]!.price).toBe(25);
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audits[0]).toMatchObject({ action: "canteen_dishes.create", actorUserId: userId });
  });
});

describe("the price sheet", () => {
  it("saves only the dishes that changed, each with audit, revision and history", async () => {
    const a = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    const b = await saveDish({ price: 40, checkedOn: "2026-10-21", slug: "17-coffee", nameEn: "Coffee" });
    const dishes = await stallPriceSheet(db, stallId);
    const saved = await updateStallPrices({ db, actor: actor(), dishes, prices: { [a.id]: 25, [b.id]: 45 }, checkedOn: "2026-10-23", confirmAll: false });
    expect(saved).toBe(1);
    expect(await history(a.id)).toHaveLength(1);
    expect(await history(b.id)).toMatchObject([{ price: 40 }, { price: 45, checkedOn: "2026-10-23" }]);
    const updates = await db.select().from(auditLog).where(eq(auditLog.entityId, b.id));
    expect(updates.map((r) => r.action).sort()).toEqual(["canteen_dishes.create", "canteen_dishes.update"]);
  });

  it("with confirm-all, also stamps unchanged dishes as checked", async () => {
    const a = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    const saved = await updateStallPrices({ db, actor: actor(), dishes: await stallPriceSheet(db, stallId), prices: { [a.id]: 25 }, checkedOn: "2026-10-23", confirmAll: true });
    expect(saved).toBe(1);
    expect(await history(a.id)).toMatchObject([{ price: 25, checkedOn: "2026-10-21" }, { price: 25, checkedOn: "2026-10-23" }]);
  });
});

describe("what the public canteen read sees", () => {
  it("returns an edited dish, its variants and the new check date, and the edited floor plan", async () => {
    const { readCanteenData } = await import("@/lib/content/canteen");
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    await saveDish({ price: 30, checkedOn: "2026-10-21" }, id);
    await saveContent({
      entityType: "canteenSettings",
      table: canteenSettings,
      actor: actor(),
      db,
      status: "published",
      values: { singletonKey: "canteen", gridCols: 12, gridRows: 8, riverSide: "west", entrances: [{ label: { th: "ประตู", en: "Gate" }, col: 0, row: 3, side: "west" }] },
    });

    const data = await readCanteenData(db);
    expect(data.dishes).toHaveLength(1);
    expect(data.dishes[0]).toMatchObject({
      price: 30,
      checkedOn: "2026-10-23",
      stallId,
      variants: [{ label: { th: "พิเศษ", en: "Special" }, delta: 10 }],
      name: { en: "Thai tea" },
    });
    expect(data.settings).toMatchObject({ gridCols: 12, gridRows: 8, riverSide: "west", entrances: [{ label: { en: "Gate" }, side: "west" }] });
    expect(revalidateFor).toHaveBeenCalledWith("canteenDish", "17-thai-tea");
    expect(revalidateFor).toHaveBeenCalledWith("canteenSettings");
  });

  it("hides a dish once it is unpublished", async () => {
    const { readCanteenData } = await import("@/lib/content/canteen");
    const { id } = await saveDish({ price: 25, checkedOn: "2026-10-21" });
    await saveContent({ entityType: "canteenDish", table: canteenDishes, actor: actor(), db, id, status: "draft", values: {} });
    expect((await readCanteenData(db)).dishes).toHaveLength(0);
  });
});
