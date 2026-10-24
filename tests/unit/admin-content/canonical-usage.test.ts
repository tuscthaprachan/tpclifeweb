import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { canonicalDishUsage } from "@/app/admin/content/canonical-dishes/usage";
import { canonicalDishes, canteenDishes, canteenStalls } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
let stallId: string;

beforeAll(async () => {
  ({ db } = await createTestDb());
});

beforeEach(async () => {
  await db.delete(canteenDishes);
  await db.delete(canteenStalls);
  await db.delete(canonicalDishes);
  const [stall] = await db.insert(canteenStalls).values({ slug: "1-rice", number: 1, mapCol: 0, mapRow: 0 }).returning();
  stallId = stall!.id;
});

const newDish = (slug: string, canonicalId: string | null, nameEn = slug) =>
  db.insert(canteenDishes).values({ slug, nameEn, stallId, canonicalId, price: 30, checkedOn: "2026-10-21", type: "drink", course: "drink", temperature: "cold" });

describe("canonicalDishUsage", () => {
  it("counts the dishes linked to a canonical dish and names the first few", async () => {
    const [canonical] = await db.insert(canonicalDishes).values({ slug: "khao-gaeng" }).returning();
    const [other] = await db.insert(canonicalDishes).values({ slug: "som-tam" }).returning();
    expect(await canonicalDishUsage(db, canonical!.id)).toEqual({ total: 0, dishes: [] });

    for (const n of ["c", "a", "b"]) await newDish(`dish-${n}`, canonical!.id, `Dish ${n}`);
    await newDish("elsewhere", other!.id);
    await newDish("unlinked", null);

    const usage = await canonicalDishUsage(db, canonical!.id, 2);
    expect(usage.total).toBe(3);
    expect(usage.dishes.map((d) => d.nameEn)).toEqual(["Dish a", "Dish b"]);
  });

  it("reports only the count when no names are wanted", async () => {
    const [canonical] = await db.insert(canonicalDishes).values({ slug: "khao-gaeng" }).returning();
    await newDish("one", canonical!.id);
    expect(await canonicalDishUsage(db, canonical!.id, 0)).toEqual({ total: 1, dishes: [] });
  });
});
