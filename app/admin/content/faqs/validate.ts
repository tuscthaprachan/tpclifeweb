import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken, SLUG_MAX, SLUG_PATTERN } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { faqs } from "@/lib/db/schema";
import { CATEGORIES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { missingFormIds } from "../_pages/validate";

/**
 * Everything an FAQ form must satisfy, apart from writing it. The slug is an
 * optional anchor name, so it is checked only when something is typed.
 */
export async function validateFaqForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    slug: k.nullableText(L("faqsFieldSlug"), { max: SLUG_MAX }),
    question: k.bilingual(L("faqsFieldQuestion"), { required: true, max: 300 }),
    answer: k.bilingualRichText(L("faqsFieldAnswer"), { required: true }),
    category: k.enumOf(L("fieldCategory"), CATEGORIES),
    sortOrder: k.integer(L("pagesFieldSortOrder"), { min: 0, max: 9999 }),
    forms: k.references(L("faqsFieldForms"), { max: 30 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (data.slug !== null) {
      if (!SLUG_PATTERN.test(data.slug)) errors.slug = L("errSlugFormat");
      else if (await isSlugTaken(db, { table: faqs, slugColumn: faqs.slug, idColumn: faqs.id, slug: data.slug, excludeId: id ?? undefined })) {
        errors.slug = L("errSlugTaken");
      }
    }
    if ((await missingFormIds(db, data.forms)).length > 0) errors.forms = a("errSelectField", locale, { field: L("faqsFieldForms") });
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}
