"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { canonicalDishes } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateCanonicalForm } from "./validate";

const LIST = "/admin/content/canonical-dishes";

/** Create (id null) or update a canonical dish. Bound with `.bind(null, id)`. */
export async function saveCanonicalDish(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: canonicalDishes.status }).from(canonicalDishes).where(eq(canonicalDishes.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateCanonicalForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent, data } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "canonicalDish",
      table: canonicalDishes,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug: data.slug,
        nameTh: data.name.th,
        nameEn: data.name.en,
        aliases: data.aliases,
        explainerTh: data.explainer.th || null,
        explainerEn: data.explainer.en || null,
        howToOrder: data.howToOrder.map((p) => ({ th: p.th, romanised: p.romanised, en: p.en })),
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

/** Deletes a canonical dish; dishes that pointed at it simply lose the link. Bound with `.bind(null, id)`. */
export async function deleteCanonicalDish(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "canonicalDish", table: canonicalDishes, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
