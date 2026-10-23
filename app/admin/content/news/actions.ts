"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { newsPostImages, newsPosts, newsPostTags } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateNewsForm } from "./validate";

const LIST = "/admin/content/news";

/**
 * Create (id null) or update a news post. Bound to the page with
 * `.bind(null, id)`; useActionState supplies `prev` and `formData`.
 * Returns field errors, or redirects to the edit page when saved.
 */
export async function saveNewsPost(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: newsPosts.status }).from(newsPosts).where(eq(newsPosts.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateNewsForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  const { slug, title, summary, body, owner, category, publishedAt, cover, gallery, tags } = checked.data;
  const keptTags = tags.filter((t) => t.th || t.en);

  let saved;
  try {
    saved = await saveContent({
      entityType: "newsPost",
      table: newsPosts,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug,
        titleTh: title.th,
        titleEn: title.en,
        summaryTh: summary.th,
        summaryEn: summary.en,
        bodyTh: body.th,
        bodyEn: body.en,
        owner,
        category,
        publishedAt,
        coverImageId: cover,
      },
      children: async (tx, newsPostId) => {
        await tx.delete(newsPostImages).where(eq(newsPostImages.newsPostId, newsPostId));
        await tx.delete(newsPostTags).where(eq(newsPostTags.newsPostId, newsPostId));
        const galleryRows = gallery.map((imageId, position) => ({ newsPostId, imageId, position }));
        const tagRows = keptTags.map((t, position) => ({ newsPostId, position, labelTh: t.th, labelEn: t.en }));
        if (galleryRows.length > 0) await tx.insert(newsPostImages).values(galleryRows);
        if (tagRows.length > 0) await tx.insert(newsPostTags).values(tagRows);
        return { gallery: galleryRows, tags: tagRows };
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

/** Deletes a news post (its gallery and tags go with it) and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteNewsPost(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "newsPost", table: newsPosts, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
