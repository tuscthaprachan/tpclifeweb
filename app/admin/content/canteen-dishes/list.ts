import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { canteenDishes, canteenStalls } from "@/lib/db/schema";

export const DISH_PAGE_SIZE = 50;

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface DishListRow {
  id: string;
  name: { th: string; en: string };
  status: "draft" | "published";
  price: number;
  checkedOn: string;
  stallNumber: number;
  updatedAt: Date;
}

/** Dishes by stall number then name, filtered by stall and by text in either name, the menu number or the web address name. */
export async function listDishRows(
  db: AuditExecutor,
  options: { stallId?: string; q?: string; page?: number },
): Promise<{ rows: DishListRow[]; total: number }> {
  const q = options.q?.trim();
  const like = q ? `%${escapeLike(q)}%` : undefined;
  const where = and(
    options.stallId ? eq(canteenDishes.stallId, options.stallId) : undefined,
    like ? or(ilike(canteenDishes.nameTh, like), ilike(canteenDishes.nameEn, like), ilike(canteenDishes.menuNumber, like), ilike(canteenDishes.slug, like)) : undefined,
  );
  const page = Math.max(1, options.page ?? 1);

  const rows = await db
    .select({
      id: canteenDishes.id,
      nameTh: canteenDishes.nameTh,
      nameEn: canteenDishes.nameEn,
      status: canteenDishes.status,
      price: canteenDishes.price,
      checkedOn: canteenDishes.checkedOn,
      stallNumber: canteenStalls.number,
      updatedAt: canteenDishes.updatedAt,
    })
    .from(canteenDishes)
    .innerJoin(canteenStalls, eq(canteenStalls.id, canteenDishes.stallId))
    .where(where)
    .orderBy(asc(canteenStalls.number), asc(canteenDishes.nameEn), asc(canteenDishes.slug))
    .limit(DISH_PAGE_SIZE)
    .offset((page - 1) * DISH_PAGE_SIZE);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(canteenDishes).where(where);

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      name: { th: r.nameTh, en: r.nameEn },
      status: r.status,
      price: r.price,
      checkedOn: r.checkedOn,
      stallNumber: r.stallNumber,
      updatedAt: r.updatedAt,
    })),
  };
}
