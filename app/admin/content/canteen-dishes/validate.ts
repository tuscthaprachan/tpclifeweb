import { eq } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { checkImages } from "@/lib/admin/content/images";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { canonicalDishes, canteenDishes, canteenStalls } from "@/lib/db/schema";
import { ALLERGENS, COOKING_STYLES, DISH_COURSES, DISH_TYPES, PROTEINS, TEMPERATURES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { enumList, isBlankRow, requireBoth, requireValue, rowList, todayBangkok } from "../canteen-stalls/shared";

/**
 * Everything a dish form must satisfy, apart from writing it. `now` is only
 * for tests: "checked on" cannot be a day that has not happened yet.
 */
export async function validateDishForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus; now?: Date },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const sayRow = z.object({ th: k.text(L("canteenFieldSayTh"), { max: 200 }), romanised: k.text(L("canteenFieldSayRomanised"), { max: 200 }) });
  const variantRow = z.object({
    label: k.bilingual(L("canteenFieldVariantLabel"), { max: 120 }),
    delta: k.integer(L("canteenFieldDelta"), { min: 0, max: 1000 }),
  });

  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("canteenFieldName"), { required: true, max: 200 }),
    stallId: k.reference(L("canteenFieldStall"), { required: true }),
    canonicalId: k.reference(L("canteenFieldCanonical")),
    menuNumber: k.nullableText(L("canteenFieldMenuNumber"), { max: 20 }),
    price: k.integer(L("canteenFieldPrice"), { min: 0, max: 10000, required: true }),
    checkedOn: k.date(L("canteenFieldCheckedOn"), { required: true }),
    lastReviewed: k.date(L("canteenFieldLastReviewed")),
    type: k.enumOf(L("canteenFieldType"), DISH_TYPES),
    course: k.enumOf(L("canteenFieldCourse"), DISH_COURSES),
    protein: enumList(L("canteenFieldProtein"), PROTEINS, locale),
    contains: enumList(L("canteenFieldContains"), ALLERGENS, locale),
    style: k.enumOf(L("canteenFieldStyle"), COOKING_STYLES, { required: false }),
    temperature: k.enumOf(L("canteenFieldTemperature"), TEMPERATURES),
    wet: k.checkbox(),
    vegetarian: k.checkbox(),
    photo: k.reference(L("canteenFieldPhoto")),
    sayAs: rowList(sayRow, 10).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireValue(ctx, locale, [i, "th"], !row.th, L("canteenFieldSayTh"));
        requireValue(ctx, locale, [i, "romanised"], !row.romanised, L("canteenFieldSayRomanised"));
      });
    }),
    variants: rowList(variantRow, 20).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireBoth(ctx, locale, [i, "label"], row.label, L("canteenFieldVariantLabel"));
        requireValue(ctx, locale, [i, "delta"], row.delta === null, L("canteenFieldDelta"));
      });
    }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (await isSlugTaken(db, { table: canteenDishes, slugColumn: canteenDishes.slug, idColumn: canteenDishes.id, slug: data.slug, excludeId: id ?? undefined })) {
      errors.slug = L("errSlugTaken");
    }
    if (data.stallId) {
      const [stall] = await db.select({ id: canteenStalls.id }).from(canteenStalls).where(eq(canteenStalls.id, data.stallId));
      if (!stall) errors.stallId = a("errSelectField", locale, { field: L("canteenFieldStall") });
    }
    if (data.canonicalId) {
      const [canonical] = await db.select({ id: canonicalDishes.id }).from(canonicalDishes).where(eq(canonicalDishes.id, data.canonicalId));
      if (!canonical) errors.canonicalId = a("errSelectField", locale, { field: L("canteenFieldCanonical") });
    }
    if (data.protein.length === 0) errors.protein = L("canteenErrProtein");
    else if (data.protein.includes("none") && data.protein.length > 1) errors.protein = L("canteenErrProteinNone");
    const today = todayBangkok(input.now);
    if (data.checkedOn && data.checkedOn > today) errors.checkedOn = L("canteenErrFutureDate");
    if (data.lastReviewed && data.lastReviewed > today) errors.lastReviewed = L("canteenErrFutureDate");
    if (data.photo) {
      const images = await checkImages(db, [data.photo]);
      if (images.missing.includes(data.photo)) errors.photo = a("errSelectField", locale, { field: L("canteenFieldPhoto") });
      else if (publishing && images.undescribed.includes(data.photo)) errors.photo = L("errImageUndescribed");
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const data = parsed.data;
  return {
    ok: true as const,
    ...resolved,
    data: {
      ...data,
      stallId: data.stallId!,
      price: data.price!,
      checkedOn: data.checkedOn!,
      type: data.type!,
      course: data.course!,
      temperature: data.temperature!,
      sayAs: data.sayAs.filter((row) => !isBlankRow(row)),
      variants: data.variants.filter((row) => !isBlankRow(row)),
    },
  };
}
