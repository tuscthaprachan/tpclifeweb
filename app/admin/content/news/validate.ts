import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { checkImages } from "@/lib/admin/content/images";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { newsPosts } from "@/lib/db/schema";
import { CATEGORIES, OWNERS, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Everything a news post form must satisfy, apart from writing it. Split out
 * of the Server Action so tests can run it against a database without a
 * signed-in session.
 */
export async function validateNewsForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    summary: k.bilingual(L("fieldSummary"), { required: true, max: 500 }),
    body: k.bilingualRichText(L("fieldBody"), { required: true }),
    owner: k.enumOf(L("fieldOwner"), OWNERS),
    category: k.enumOf(L("fieldCategory"), CATEGORIES, { required: false }),
    publishedAt: k.dateTime(L("fieldPublishedAt")),
    cover: k.reference(L("fieldCoverImage")),
    gallery: k.references(L("fieldGallery"), { max: 30 }),
    tags: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(k.bilingual(L("fieldTag"), { max: 60 })).max(20)),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    const taken = await isSlugTaken(db, {
      table: newsPosts,
      slugColumn: newsPosts.slug,
      idColumn: newsPosts.id,
      slug: data.slug,
      excludeId: id ?? undefined,
    });
    if (taken) errors.slug = L("errSlugTaken");

    const images = await checkImages(db, [...(data.cover ? [data.cover] : []), ...data.gallery]);
    if (data.cover && images.missing.includes(data.cover)) errors.cover = a("errSelectField", locale, { field: L("fieldCoverImage") });
    else if (publishing && data.cover && images.undescribed.includes(data.cover)) errors.cover = L("errImageUndescribed");
    if (data.gallery.some((g) => images.missing.includes(g))) errors.gallery = a("errSelectField", locale, { field: L("fieldGallery") });
    else if (publishing && data.gallery.some((g) => images.undescribed.includes(g))) errors.gallery = L("errImageUndescribed");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}
