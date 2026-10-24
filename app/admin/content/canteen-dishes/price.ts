import type { AuditExecutor } from "@/lib/db/audit";
import { canteenDishPriceHistory } from "@/lib/db/schema";

/**
 * What a save does about a dish's price. History is append-only evidence, so
 * a changed price, or a later "checked on" date, adds a row; nothing is lost.
 * Changing the price without touching the date means it was checked today.
 */
export function planPrice(
  before: { price: number; checkedOn: string } | undefined,
  next: { price: number; checkedOn: string },
  today: string,
): { checkedOn: string; record: boolean } {
  if (!before) return { checkedOn: next.checkedOn, record: true };
  const priceChanged = next.price !== before.price;
  const dateChanged = next.checkedOn !== before.checkedOn;
  return {
    checkedOn: priceChanged && !dateChanged ? today : next.checkedOn,
    record: priceChanged || dateChanged,
  };
}

/** Appends (or, for the same day, corrects) one price history row. Call inside the save's transaction. */
export async function recordPrice(tx: AuditExecutor, dishId: string, price: number, checkedOn: string): Promise<{ dishId: string; price: number; checkedOn: string }> {
  const row = { dishId, price, checkedOn };
  await tx
    .insert(canteenDishPriceHistory)
    .values(row)
    .onConflictDoUpdate({ target: [canteenDishPriceHistory.dishId, canteenDishPriceHistory.checkedOn], set: { price } });
  return row;
}
