import { eq } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import type { AuditExecutor } from "@/lib/db/audit";
import { places } from "@/lib/db/schema";
import { FLOOR_SIDES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { isBlankRow, requireBoth, requireValue, rowList } from "../canteen-stalls/shared";

export const LANDMARK_KINDS = ["stairs", "lifts", "toilets", "atm", "lobby"] as const;
const MAX_CELL = 200;

/**
 * Everything the canteen settings form must satisfy, apart from writing it.
 * The singleton is always live (the map needs it), so there is no draft rule.
 */
export async function validateCanteenSettingsForm(db: AuditExecutor, input: { locale: Locale; formData: FormData }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);

  const k = fieldKit(locale, true);
  const cell = (key: AdminKey, min = 0) => k.integer(L(key), { min, max: MAX_CELL });
  const entranceRow = z.object({ label: k.bilingual(L("canteenFieldLabel"), { max: 100 }), col: cell("canteenFieldCol"), row: cell("canteenFieldRow"), side: k.enumOf(L("canteenFieldSide"), FLOOR_SIDES, { required: false }) });
  const zoneRow = z.object({ label: k.bilingual(L("canteenFieldLabel"), { max: 100 }), col: cell("canteenFieldCol"), row: cell("canteenFieldRow"), w: cell("canteenFieldW", 1), h: cell("canteenFieldH", 1) });
  const pointRow = z.object({ col: cell("canteenFieldCol"), row: cell("canteenFieldRow") });
  const landmarkRow = z.object({
    kind: k.enumOf(L("canteenFieldLandmarkKind"), LANDMARK_KINDS, { required: false }),
    label: k.bilingual(L("canteenFieldLabel"), { max: 100 }),
    col: cell("canteenFieldCol"),
    row: cell("canteenFieldRow"),
    w: cell("canteenFieldW", 1),
    h: cell("canteenFieldH", 1),
  });

  const need = (ctx: z.RefinementCtx, i: number, row: Record<string, unknown>, keys: [string, AdminKey][]) => {
    for (const [key, label] of keys) requireValue(ctx, locale, [i, key], row[key] === null || row[key] === undefined, L(label));
  };
  const COL_ROW: [string, AdminKey][] = [["col", "canteenFieldCol"], ["row", "canteenFieldRow"]];
  const SIZE: [string, AdminKey][] = [["w", "canteenFieldW"], ["h", "canteenFieldH"]];

  const schema = z.object({
    canteenPlace: k.reference(L("canteenFieldPlace")),
    gridCols: k.integer(L("canteenFieldGridCols"), { min: 1, max: MAX_CELL, required: true }),
    gridRows: k.integer(L("canteenFieldGridRows"), { min: 1, max: MAX_CELL, required: true }),
    riverSide: k.enumOf(L("canteenFieldRiverSide"), FLOOR_SIDES, { required: false }),
    entrances: rowList(entranceRow, 20).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireBoth(ctx, locale, [i, "label"], row.label, L("canteenFieldLabel"));
        need(ctx, i, row, [...COL_ROW, ["side", "canteenFieldSide"]]);
      });
    }),
    seatingZones: rowList(zoneRow, 30).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireBoth(ctx, locale, [i, "label"], row.label, L("canteenFieldLabel"));
        need(ctx, i, row, [...COL_ROW, ...SIZE]);
      });
    }),
    outline: rowList(pointRow, 60).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (!isBlankRow(row)) need(ctx, i, row, COL_ROW);
      });
    }),
    landmarks: rowList(landmarkRow, 40).superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (isBlankRow(row)) return;
        requireBoth(ctx, locale, [i, "label"], row.label, L("canteenFieldLabel"));
        need(ctx, i, row, [["kind", "canteenFieldLandmarkKind"], ...COL_ROW, ...SIZE]);
      });
    }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    if (data.canteenPlace) {
      const [place] = await db.select({ id: places.id }).from(places).where(eq(places.id, data.canteenPlace));
      if (!place) errors.canteenPlace = a("errSelectField", locale, { field: L("canteenFieldPlace") });
    }
    const cols = data.gridCols ?? 0;
    const rowsMax = data.gridRows ?? 0;
    const outside = (path: string) => (errors[path] ??= L("canteenErrOutsideGrid"));
    data.entrances.forEach((r, i) => {
      if ((r.col ?? 0) > cols) outside(`entrances.${i}.col`);
      if ((r.row ?? 0) > rowsMax) outside(`entrances.${i}.row`);
    });
    data.outline.forEach((r, i) => {
      if ((r.col ?? 0) > cols) outside(`outline.${i}.col`);
      if ((r.row ?? 0) > rowsMax) outside(`outline.${i}.row`);
    });
    for (const [name, list] of [["seatingZones", data.seatingZones], ["landmarks", data.landmarks]] as const) {
      list.forEach((r, i) => {
        if ((r.col ?? 0) + (r.w ?? 0) > cols) outside(`${name}.${i}.col`);
        if ((r.row ?? 0) + (r.h ?? 0) > rowsMax) outside(`${name}.${i}.row`);
      });
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const data = parsed.data;
  const keep = <T,>(rows: T[]) => rows.filter((row) => !isBlankRow(row));
  return {
    ok: true as const,
    data: {
      canteenPlace: data.canteenPlace,
      gridCols: data.gridCols!,
      gridRows: data.gridRows!,
      riverSide: data.riverSide,
      entrances: keep(data.entrances).map((r) => ({ label: r.label, col: r.col!, row: r.row!, side: r.side! })),
      seatingZones: keep(data.seatingZones).map((r) => ({ label: r.label, col: r.col!, row: r.row!, w: r.w!, h: r.h! })),
      outline: keep(data.outline).map((r) => ({ col: r.col!, row: r.row! })),
      landmarks: keep(data.landmarks).map((r) => ({ kind: r.kind!, label: r.label, col: r.col!, row: r.row!, w: r.w!, h: r.h! })),
    },
  };
}
