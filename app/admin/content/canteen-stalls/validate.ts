import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { checkImages } from "@/lib/admin/content/images";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { canteenDishes, canteenSettings, canteenStalls } from "@/lib/db/schema";
import { CANTEEN_CUISINES, DISH_COURSES, MAP_SHAPES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { enumList, isBlankRow, requireBoth, requireValue, rowList } from "./shared";

export const WEEKDAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Everything a stall form must satisfy, apart from writing it. Split out of
 * the Server Action so tests can run it against a database without a session.
 */
export async function validateStallForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const hoursRow = z.object({
    daysOfWeek: enumList(L("canteenFieldDays"), WEEKDAYS, locale),
    opens: k.text(L("canteenFieldOpens"), { max: 5 }),
    closes: k.text(L("canteenFieldCloses"), { max: 5 }),
    note: k.bilingual(L("canteenFieldHoursNote"), { max: 200 }),
  });
  const addOnRow = z.object({
    label: k.bilingual(L("canteenFieldAddOnLabel"), { max: 120 }),
    delta: k.integer(L("canteenFieldDelta"), { min: 0, max: 1000 }),
    courses: enumList(L("canteenFieldCourses"), DISH_COURSES, locale),
    dishIds: k.references(L("canteenFieldAddOnDishes"), { max: 300 }),
  });

  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("canteenFieldName"), { required: true, max: 200 }),
    number: k.integer(L("canteenFieldNumber"), { min: 1, max: 999, required: true }),
    cuisine: enumList(L("canteenFieldCuisine"), CANTEEN_CUISINES, locale),
    halal: k.checkbox(),
    vegetarianStall: k.checkbox(),
    hours: rowList(hoursRow, 14).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireValue(ctx, locale, [i, "daysOfWeek"], row.daysOfWeek.length === 0, L("canteenFieldDays"));
        for (const key of ["opens", "closes"] as const) {
          const label = L(key === "opens" ? "canteenFieldOpens" : "canteenFieldCloses");
          if (!row[key]) requireValue(ctx, locale, [i, key], true, label);
          else if (!TIME.test(row[key])) ctx.addIssue({ code: "custom", path: [i, key], message: a("canteenErrTime", locale, { field: label }) });
        }
      });
    }),
    mapCol: k.integer(L("canteenFieldMapCol"), { min: 0, max: 200, required: true }),
    mapRow: k.integer(L("canteenFieldMapRow"), { min: 0, max: 200, required: true }),
    mapW: k.integer(L("canteenFieldMapW"), { min: 1, max: 200, required: true }),
    mapH: k.integer(L("canteenFieldMapH"), { min: 1, max: 200, required: true }),
    mapShape: k.enumOf(L("canteenFieldMapShape"), MAP_SHAPES),
    wayfinding: k.bilingual(L("canteenFieldWayfinding"), { max: 500 }),
    photo: k.reference(L("canteenFieldPhoto")),
    addOns: rowList(addOnRow, 30).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireBoth(ctx, locale, [i, "label"], row.label, L("canteenFieldAddOnLabel"));
        requireValue(ctx, locale, [i, "delta"], row.delta === null, L("canteenFieldDelta"));
      });
    }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (await isSlugTaken(db, { table: canteenStalls, slugColumn: canteenStalls.slug, idColumn: canteenStalls.id, slug: data.slug, excludeId: id ?? undefined })) {
      errors.slug = L("errSlugTaken");
    }
    if (data.number !== null) {
      const clash = await db
        .select({ id: canteenStalls.id })
        .from(canteenStalls)
        .where(and(eq(canteenStalls.number, data.number), id ? ne(canteenStalls.id, id) : undefined))
        .limit(1);
      if (clash.length > 0) errors.number = L("canteenErrNumberTaken");
    }

    const [grid] = await db.select({ cols: canteenSettings.gridCols, rows: canteenSettings.gridRows }).from(canteenSettings).limit(1);
    if (grid && data.mapCol !== null && data.mapRow !== null && data.mapW !== null && data.mapH !== null) {
      if (data.mapCol + data.mapW > grid.cols) errors.mapCol ??= L("canteenErrOutsideGrid");
      if (data.mapRow + data.mapH > grid.rows) errors.mapRow ??= L("canteenErrOutsideGrid");
    }

    if (data.photo) {
      const images = await checkImages(db, [data.photo]);
      if (images.missing.includes(data.photo)) errors.photo = a("errSelectField", locale, { field: L("canteenFieldPhoto") });
      else if (publishing && images.undescribed.includes(data.photo)) errors.photo = L("errImageUndescribed");
    }

    const linked = data.addOns.flatMap((row, i) => row.dishIds.map((dishId) => ({ i, dishId })));
    if (linked.length > 0) {
      const own = id
        ? await db
            .select({ id: canteenDishes.id })
            .from(canteenDishes)
            .where(and(eq(canteenDishes.stallId, id), inArray(canteenDishes.id, [...new Set(linked.map((l) => l.dishId))])))
        : [];
      const ownIds = new Set(own.map((r) => r.id));
      for (const { i, dishId } of linked) {
        if (!ownIds.has(dishId)) errors[`addOns.${i}.dishIds`] ??= L("canteenErrAddOnDish");
      }
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const data = parsed.data;
  return {
    ok: true as const,
    ...resolved,
    data: {
      ...data,
      number: data.number!,
      mapCol: data.mapCol!,
      mapRow: data.mapRow!,
      mapW: data.mapW!,
      mapH: data.mapH!,
      mapShape: data.mapShape!,
      hours: data.hours.filter((row) => !isBlankRow(row)),
      addOns: data.addOns.filter((row) => !isBlankRow(row)),
    },
  };
}
