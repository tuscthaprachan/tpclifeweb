import { z } from "zod";
import { fieldKit, formDataToObject, parseForm, type FieldKit } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { places } from "@/lib/db/schema";
import type { OpeningHoursJson } from "@/lib/db/schema/content/common";
import { CATEGORIES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { coordinatePairIssue, extraKit, rowsOf } from "../organisations/_shared/rows";

function hoursRow(k: FieldKit, x: ReturnType<typeof extraKit>, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      days: x.days(),
      opens: x.time(L("placesFieldOpens")),
      closes: x.time(L("placesFieldCloses")),
      note: k.bilingual(L("placesFieldHoursNote"), { max: 200 }),
    })
    .superRefine((row, ctx) => {
      if (row.opens && row.closes && row.closes <= row.opens) ctx.addIssue({ code: "custom", path: ["closes"], message: L("placesErrCloseAfterOpen") });
    })
    .transform(
      (row): OpeningHoursJson => ({
        daysOfWeek: row.days,
        opens: row.opens!,
        closes: row.closes!,
        ...(row.note.th || row.note.en ? { note: { th: row.note.th, en: row.note.en } } : {}),
      }),
    );
}

/**
 * Everything a place form must satisfy, apart from writing it. Split out of
 * the Server Action so tests can run it against a database without a
 * signed-in session.
 */
export async function validatePlaceForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);

  const k = fieldKit(locale, resolved.publishing);
  const x = extraKit(locale);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("dirFieldName"), { required: true, max: 150 }),
    building: k.bilingual(L("placesFieldBuilding"), { max: 150 }),
    description: k.bilingual(L("dirFieldDescription"), { max: 1500 }),
    category: k.enumOf(L("fieldCategory"), CATEGORIES),
    openingHours: rowsOf(hoursRow(k, x, locale), { max: 14 }),
    closureNote: k.bilingual(L("placesFieldClosure"), { max: 300 }),
    lat: x.decimal(L("dirFieldLat"), { min: -90, max: 90 }),
    lng: x.decimal(L("dirFieldLng"), { min: -180, max: 180 }),
    isKeyLocation: k.checkbox(),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const { data } = parsed;
    const taken = await isSlugTaken(db, { table: places, slugColumn: places.slug, idColumn: places.id, slug: data.slug, excludeId: id ?? undefined });
    if (taken) errors.slug = L("errSlugTaken");
    if (coordinatePairIssue(data.lat, data.lng)) errors[data.lat === null ? "lat" : "lng"] = L("dirErrCoordinatePair");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}
