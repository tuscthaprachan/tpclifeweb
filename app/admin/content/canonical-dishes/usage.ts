import { asc, count, eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { canteenDishes } from "@/lib/db/schema";

/** How many dishes the delete message names before it says "and N more". */
export const CANONICAL_USAGE_SHOWN = 10;

export interface CanonicalUsage {
  total: number;
  /** The first few dishes, by English name, for linking to. */
  dishes: { id: string; nameTh: string; nameEn: string }[];
}

/**
 * The stall dishes linked to a canonical dish. The foreign key only clears the
 * link on delete, which would quietly strip those dishes of their explainer,
 * so the delete action refuses while any remain.
 */
export async function canonicalDishUsage(db: AuditExecutor, canonicalId: string, limit = CANONICAL_USAGE_SHOWN): Promise<CanonicalUsage> {
  const [[c], dishes] = await Promise.all([
    db.select({ n: count() }).from(canteenDishes).where(eq(canteenDishes.canonicalId, canonicalId)),
    db
      .select({ id: canteenDishes.id, nameTh: canteenDishes.nameTh, nameEn: canteenDishes.nameEn })
      .from(canteenDishes)
      .where(eq(canteenDishes.canonicalId, canonicalId))
      .orderBy(asc(canteenDishes.nameEn), asc(canteenDishes.id))
      .limit(limit),
  ]);
  return { total: c?.n ?? 0, dishes };
}
