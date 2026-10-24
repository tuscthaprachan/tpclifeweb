import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { contentPages, forms } from "@/lib/db/schema";
import { CATEGORIES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { externalLinks } from "./rows";

export type ContentPageKind = "guide" | "welfare";

/** Ids in `ids` that are not a form, for the related-form pickers. */
export async function missingFormIds(db: AuditExecutor, ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db.select({ id: forms.id }).from(forms).where(inArray(forms.id, [...ids]));
  const found = new Set(rows.map((r) => r.id));
  return ids.filter((id) => !found.has(id));
}

/**
 * Everything a guide or welfare page form must satisfy, apart from writing
 * it. The two kinds share one form, so `kind` only decides where the slug
 * must be unique and which row an edit may touch.
 */
export async function validatePageForm(
  db: AuditExecutor,
  input: { kind: ContentPageKind; locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { kind, locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    summary: k.bilingual(L("fieldSummary"), { required: true, max: 500 }),
    body: k.bilingualRichText(L("fieldBody"), { required: true }),
    category: k.enumOf(L("fieldCategory"), CATEGORIES),
    sortOrder: k.integer(L("pagesFieldSortOrder"), { min: 0, max: 9999 }),
    lastReviewed: k.date(L("pagesFieldLastReviewed")),
    forms: k.references(L("pagesFieldRelatedForms"), { max: 30 }),
    related: k.references(L("pagesFieldRelatedPages"), { max: 30 }),
    links: externalLinks(k, L),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    const taken = await isSlugTaken(db, {
      table: contentPages,
      slugColumn: contentPages.slug,
      idColumn: contentPages.id,
      slug: data.slug,
      excludeId: id ?? undefined,
      where: eq(contentPages.kind, kind),
    });
    if (taken) errors.slug = L("errSlugTaken");

    if ((await missingFormIds(db, data.forms)).length > 0) errors.forms = a("errSelectField", locale, { field: L("pagesFieldRelatedForms") });

    if (id && data.related.includes(id)) errors.related = L("pagesErrRelatedSelf");
    else if (data.related.length > 0) {
      const found = await db.select({ id: contentPages.id }).from(contentPages).where(inArray(contentPages.id, data.related));
      if (found.length !== data.related.length) errors.related = a("errSelectField", locale, { field: L("pagesFieldRelatedPages") });
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}
