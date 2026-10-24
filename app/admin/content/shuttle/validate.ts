import { z } from "zod";
import { fieldKit, formDataToObject, parseForm, type FieldKit } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { shuttleRoutes } from "@/lib/db/schema";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { coordinatePairIssue, extraKit, rowsOf } from "../organisations/_shared/rows";

export interface StopInput {
  name: { th: string; en: string };
  offsetMinutes: number;
  note: { th: string; en: string };
  lat: number | null;
  lng: number | null;
}

function stopRow(k: FieldKit, x: ReturnType<typeof extraKit>, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      name: k.bilingual(L("shuttleFieldStop"), { required: true, max: 150 }),
      offsetMinutes: k.integer(L("shuttleFieldOffset"), { min: 0, max: 600 }),
      note: k.bilingual(L("shuttleFieldStopNote"), { max: 300 }),
      lat: x.decimal(L("dirFieldLat"), { min: -90, max: 90 }),
      lng: x.decimal(L("dirFieldLng"), { min: -180, max: 180 }),
    })
    .superRefine((row, ctx) => {
      if (coordinatePairIssue(row.lat, row.lng)) ctx.addIssue({ code: "custom", path: [row.lat === null ? "lat" : "lng"], message: L("dirErrCoordinatePair") });
    })
    .transform((row): StopInput => ({ name: row.name, offsetMinutes: row.offsetMinutes ?? 0, note: row.note, lat: row.lat, lng: row.lng }));
}

const sortedUnique = (values: (string | null)[]): string[] => [...new Set(values.filter((v): v is string => Boolean(v)))].sort();

/**
 * Everything a shuttle route form must satisfy, apart from writing it. Split
 * out of the Server Action so tests can run it against a database without a
 * signed-in session.
 */
export async function validateShuttleForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const x = extraKit(locale);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("dirFieldName"), { required: true, max: 150 }),
    description: k.bilingual(L("dirFieldDescription"), { max: 1500 }),
    isActive: k.checkbox(),
    daysOfWeek: x.days({ required: false }),
    validFrom: k.date(L("shuttleFieldValidFrom")),
    validUntil: k.date(L("shuttleFieldValidUntil")),
    excludedDates: rowsOf(k.date(L("shuttleFieldDate"), { required: true }), { max: 120 }),
    addedDates: rowsOf(k.date(L("shuttleFieldDate"), { required: true }), { max: 120 }),
    departures: rowsOf(x.time(L("shuttleFieldTime")), { max: 200 }),
    stops: rowsOf(stopRow(k, x, locale), {
      max: 60,
      ignore: ["offsetMinutes"],
      after: (rows, add) => {
        let previous = 0;
        rows.forEach(({ value, index }, position) => {
          if (position === 0 && value.offsetMinutes !== 0) add(index, "offsetMinutes", L("shuttleErrOffsetFirst"));
          else if (value.offsetMinutes < previous) add(index, "offsetMinutes", L("shuttleErrOffsetOrder"));
          previous = Math.max(previous, value.offsetMinutes);
        });
      },
    }),
    fare: k.bilingual(L("shuttleFieldFare"), { max: 300 }),
    notes: k.bilingual(L("shuttleFieldNotes"), { max: 1500 }),
    realtimeFeedUrl: k.url(L("shuttleFieldRealtime")),
    sourceNote: k.bilingual(L("shuttleFieldSource"), { max: 300 }),
    lastVerified: k.date(L("shuttleFieldVerified")),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const { data } = parsed;
    const taken = await isSlugTaken(db, { table: shuttleRoutes, slugColumn: shuttleRoutes.slug, idColumn: shuttleRoutes.id, slug: data.slug, excludeId: id ?? undefined });
    if (taken) errors.slug = L("errSlugTaken");
    if (data.validFrom && data.validUntil && data.validUntil < data.validFrom) errors.validUntil = L("shuttleErrDateOrder");
    if (publishing && data.isActive) {
      if (data.daysOfWeek.length === 0) errors.daysOfWeek = L("shuttleErrDays");
      if (data.departures.length === 0) errors.departures = L("shuttleErrDepartures");
      if (data.stops.length === 0) errors.stops = L("shuttleErrStops");
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const { data } = parsed;
  return {
    ok: true as const,
    data: {
      ...data,
      excludedDates: sortedUnique(data.excludedDates),
      addedDates: sortedUnique(data.addedDates),
      departures: sortedUnique(data.departures),
    },
    ...resolved,
  };
}
