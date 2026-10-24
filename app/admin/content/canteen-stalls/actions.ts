"use server";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { canteenDishes, canteenStallAddOnDishes, canteenStallAddOns, canteenStalls } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateStallForm } from "./validate";

const LIST = "/admin/content/canteen-stalls";

/**
 * Create (id null) or update a stall, with its add-ons. Bound to the page with
 * `.bind(null, id)`. Returns field errors, or redirects to the edit page.
 */
export async function saveCanteenStall(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: canteenStalls.status }).from(canteenStalls).where(eq(canteenStalls.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateStallForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent, data } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "canteenStall",
      table: canteenStalls,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug: data.slug,
        nameTh: data.name.th,
        nameEn: data.name.en,
        number: data.number,
        cuisine: data.cuisine,
        halal: data.halal,
        vegetarianStall: data.vegetarianStall,
        hours:
          data.hours.length > 0
            ? data.hours.map((h) => ({
                daysOfWeek: h.daysOfWeek.map(Number),
                opens: h.opens,
                closes: h.closes,
                ...(h.note.th || h.note.en ? { note: { th: h.note.th, en: h.note.en } } : {}),
              }))
            : null,
        mapCol: data.mapCol,
        mapRow: data.mapRow,
        mapW: data.mapW,
        mapH: data.mapH,
        mapShape: data.mapShape,
        wayfindingTh: data.wayfinding.th || null,
        wayfindingEn: data.wayfinding.en || null,
        photoId: data.photo,
      },
      children: async (tx, stallId) => {
        // Links to dishes go with their add-on (cascade), so replacing the add-ons replaces the links.
        await tx.delete(canteenStallAddOns).where(eq(canteenStallAddOns.stallId, stallId));
        const written = [];
        for (const [position, addOn] of data.addOns.entries()) {
          const [row] = await tx
            .insert(canteenStallAddOns)
            .values({ stallId, position, labelTh: addOn.label.th, labelEn: addOn.label.en, delta: addOn.delta!, courses: addOn.courses })
            .returning();
          if (addOn.dishIds.length > 0) {
            await tx.insert(canteenStallAddOnDishes).values(addOn.dishIds.map((dishId) => ({ addOnId: row!.id, dishId })));
          }
          written.push({ ...row, dishIds: addOn.dishIds });
        }
        return { addOns: written };
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) {
      const number = error.constraint?.includes("number");
      return { errors: number ? { number: L("canteenErrNumberTaken") } : { slug: L("errSlugTaken") } };
    }
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/**
 * Deletes a stall. Its dishes would go with it, so a stall that still has
 * dishes is left alone and the edit page explains. Bound with `.bind(null, id)`.
 */
export async function deleteCanteenStall(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const db = getDb();
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(canteenDishes).where(eq(canteenDishes.stallId, id));
  if (n > 0) redirect(`${LIST}/${id}`);
  try {
    await deleteContent({ entityType: "canteenStall", table: canteenStalls, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
