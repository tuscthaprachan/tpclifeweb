"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { canteenDishes, canteenDishVariants } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { todayBangkok } from "../canteen-stalls/shared";
import { planPrice, recordPrice } from "./price";
import { validateDishForm } from "./validate";

const LIST = "/admin/content/canteen-dishes";

/**
 * Create (id null) or update a dish, with its variants. A new or changed price
 * (or a later "checked on" date) also adds a row to the price history, in the
 * same transaction. Bound with `.bind(null, id)`.
 */
export async function saveCanteenDish(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id
    ? await db.select({ status: canteenDishes.status, price: canteenDishes.price, checkedOn: canteenDishes.checkedOn }).from(canteenDishes).where(eq(canteenDishes.id, id))
    : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateDishForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent, data } = checked;
  const plan = planPrice(existing, { price: data.price, checkedOn: data.checkedOn }, todayBangkok());

  let saved;
  try {
    saved = await saveContent({
      entityType: "canteenDish",
      table: canteenDishes,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug: data.slug,
        nameTh: data.name.th,
        nameEn: data.name.en,
        sayAs: data.sayAs.map((p) => ({ th: p.th, romanised: p.romanised })),
        menuNumber: data.menuNumber,
        stallId: data.stallId,
        canonicalId: data.canonicalId,
        price: data.price,
        type: data.type,
        course: data.course,
        protein: data.protein,
        contains: data.contains,
        style: data.style,
        temperature: data.temperature,
        wet: data.wet,
        vegetarian: data.vegetarian,
        photoId: data.photo,
        checkedOn: plan.checkedOn,
        lastReviewed: data.lastReviewed,
      },
      children: async (tx, dishId) => {
        await tx.delete(canteenDishVariants).where(eq(canteenDishVariants.dishId, dishId));
        const variantRows = data.variants.map((v, position) => ({ dishId, position, labelTh: v.label.th, labelEn: v.label.en, delta: v.delta! }));
        if (variantRows.length > 0) await tx.insert(canteenDishVariants).values(variantRows);
        const priceHistory = plan.record ? [await recordPrice(tx, dishId, data.price, plan.checkedOn)] : [];
        return { variants: variantRows, priceHistory };
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { slug: L("errSlugTaken") } };
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/** Deletes a dish (its variants and price history go with it) and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteCanteenDish(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "canteenDish", table: canteenDishes, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
