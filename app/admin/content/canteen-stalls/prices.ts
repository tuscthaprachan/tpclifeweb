import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { ContentActor } from "@/lib/admin/content/access";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { saveContent } from "@/lib/admin/content/save";
import type { AuditExecutor } from "@/lib/db/audit";
import { canteenDishes } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { planPrice, recordPrice } from "../canteen-dishes/price";
import { todayBangkok } from "./shared";

/** The dishes of one stall, as the price sheet lists them. */
export function stallPriceSheet(db: AuditExecutor, stallId: string) {
  return db
    .select({
      id: canteenDishes.id,
      nameTh: canteenDishes.nameTh,
      nameEn: canteenDishes.nameEn,
      menuNumber: canteenDishes.menuNumber,
      price: canteenDishes.price,
      checkedOn: canteenDishes.checkedOn,
      status: canteenDishes.status,
    })
    .from(canteenDishes)
    .where(eq(canteenDishes.stallId, stallId))
    .orderBy(asc(canteenDishes.menuNumber), asc(canteenDishes.nameEn));
}

type Sheet = Awaited<ReturnType<typeof stallPriceSheet>>;

/** Reads the price sheet form: one price per dish and the day they were checked. */
export function parsePriceForm(locale: Locale, dishes: Sheet, formData: FormData, now?: Date) {
  const k = fieldKit(locale, false);
  const today = todayBangkok(now);
  const label = a("canteenFieldPrice", locale);
  const schema = z.object({
    checkedOn: k.date(a("canteenFieldCheckedOn", locale), { required: true }),
    confirmAll: k.checkbox(),
    price: z.object(Object.fromEntries(dishes.map((d) => [d.id, k.integer(label, { min: 0, max: 10000, required: true })]))),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  if (parsed.ok && parsed.data.checkedOn && parsed.data.checkedOn > today) errors.checkedOn = a("canteenErrFutureDate", locale);
  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return {
    ok: true as const,
    checkedOn: parsed.data.checkedOn!,
    confirmAll: parsed.data.confirmAll,
    prices: parsed.data.price as Record<string, number>,
  };
}

/**
 * Saves every dish whose price changed (and, with `confirmAll`, every dish
 * whose price was merely re-checked) through `saveContent`, one transaction
 * per dish, each adding a price history row. Returns how many were saved.
 */
export async function updateStallPrices(input: {
  db: AuditExecutor;
  actor: ContentActor;
  dishes: Sheet;
  prices: Record<string, number>;
  checkedOn: string;
  confirmAll: boolean;
}): Promise<number> {
  const { db, actor, dishes, prices, checkedOn, confirmAll } = input;
  let saved = 0;
  for (const dish of dishes) {
    const price = prices[dish.id];
    if (price === undefined) continue;
    const changed = price !== dish.price;
    if (!changed && !(confirmAll && checkedOn !== dish.checkedOn)) continue;
    const plan = planPrice({ price: dish.price, checkedOn: dish.checkedOn }, { price, checkedOn }, checkedOn);
    await saveContent({
      entityType: "canteenDish",
      table: canteenDishes,
      actor,
      db,
      id: dish.id,
      values: { price, checkedOn: plan.checkedOn },
      children: async (tx, id) => ({ priceHistory: [await recordPrice(tx, id, price, plan.checkedOn)] }),
    });
    saved += 1;
  }
  return saved;
}
