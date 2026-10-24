"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { canteenStalls } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { parsePriceForm, stallPriceSheet, updateStallPrices } from "../../prices";

/** Saves the price sheet of one stall. Bound with `.bind(null, stallId)`. */
export async function saveStallPrices(stallId: string, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  if (!isUuid(stallId)) return { errors: {}, formError: a("errNotFound", locale) };
  const [stall] = await db.select({ id: canteenStalls.id }).from(canteenStalls).where(eq(canteenStalls.id, stallId));
  if (!stall) return { errors: {}, formError: a("errNotFound", locale) };

  const dishes = await stallPriceSheet(db, stallId);
  const parsed = parsePriceForm(locale, dishes, formData);
  if (!parsed.ok) return { ...EMPTY_FORM_STATE, errors: parsed.errors };

  const saved = await updateStallPrices({ db, actor: await contentActor(staff), dishes, prices: parsed.prices, checkedOn: parsed.checkedOn, confirmAll: parsed.confirmAll });
  redirect(`/admin/content/canteen-stalls/${stallId}/prices?saved=${saved}`);
}
