import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { canonicalDishes } from "@/lib/db/schema";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { isBlankRow, requireValue, rowList } from "../canteen-stalls/shared";

/** Everything a canonical dish form must satisfy, apart from writing it. */
export async function validateCanonicalForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);

  const k = fieldKit(locale, resolved.publishing);
  const phraseRow = z.object({
    th: k.text(L("canteenFieldPhraseTh"), { max: 200 }),
    romanised: k.text(L("canteenFieldSayRomanised"), { max: 200 }),
    en: k.text(L("canteenFieldPhraseEn"), { max: 200 }),
  });
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("canteenFieldName"), { required: true, max: 200 }),
    aliases: rowList(z.object({ value: k.text(L("canteenFieldAlias"), { max: 100 }) }), 30),
    explainer: k.bilingual(L("canteenFieldExplainer"), { max: 1000 }),
    howToOrder: rowList(phraseRow, 10).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireValue(ctx, locale, [i, "th"], !row.th, L("canteenFieldPhraseTh"));
        requireValue(ctx, locale, [i, "romanised"], !row.romanised, L("canteenFieldSayRomanised"));
        requireValue(ctx, locale, [i, "en"], !row.en, L("canteenFieldPhraseEn"));
      });
    }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  if (parsed.ok) {
    if (await isSlugTaken(db, { table: canonicalDishes, slugColumn: canonicalDishes.slug, idColumn: canonicalDishes.id, slug: parsed.data.slug, excludeId: id ?? undefined })) {
      errors.slug = L("errSlugTaken");
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const aliases = [...new Set(parsed.data.aliases.map((r) => r.value).filter(Boolean))];
  return {
    ok: true as const,
    ...resolved,
    data: { ...parsed.data, aliases, howToOrder: parsed.data.howToOrder.filter((row) => !isBlankRow(row)) },
  };
}
