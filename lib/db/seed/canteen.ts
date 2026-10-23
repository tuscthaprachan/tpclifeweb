import { inArray } from "drizzle-orm";
import { surveyCanteenData } from "../../canteen/dataset";
import { SURVEY_DATE } from "../../canteen/survey-2569";
import { places } from "../schema/content/directory";
import {
  canonicalDishes,
  canteenDishes,
  canteenDishPriceHistory,
  canteenDishVariants,
  canteenSettings,
  canteenStallAddOnDishes,
  canteenStallAddOns,
  canteenStalls,
} from "../schema/content/canteen";
import { excludedSet, published, type SeedDb } from "./util";

/**
 * The canteen. ONE source of truth: `surveyCanteenData()` in
 * lib/canteen/dataset.ts, which is built from lib/canteen/survey-2569.ts (every
 * priced dish on the menu boards photographed 21 October 2569) plus the stall,
 * canonical dish and floor plan definitions.
 *
 * Ids in the dataset (`survey-stall-3`, `survey-dish-<slug>`) are string
 * references. They are resolved to the uuids Postgres assigns through lookup
 * maps keyed by those ids.
 */

const CHUNK = 100;

function chunks<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export async function seedCanteen(db: SeedDb): Promise<void> {
  // A fixed clock: `now` only stamps document metadata, which Postgres owns now.
  const data = surveyCanteenData(new Date("2026-10-21T00:00:00Z"));
  const settings = data.settings;
  if (!settings) throw new Error("surveyCanteenData returned no settings");

  /* The canteen place, which carries the opening hours. */
  const canteenPlace = settings.canteen;
  if (!canteenPlace) throw new Error("surveyCanteenData returned no canteen place");
  const [place] = await db
    .insert(places)
    .values({
      ...published(),
      slug: canteenPlace.slug.current,
      nameTh: canteenPlace.name.th,
      nameEn: canteenPlace.name.en,
      category: canteenPlace.category,
      openingHours: (canteenPlace.openingHours ?? []).map((h) => ({
        daysOfWeek: h.daysOfWeek,
        opens: h.opens,
        closes: h.closes,
        ...(h.note ? { note: { th: h.note.th, en: h.note.en } } : {}),
      })),
    })
    .onConflictDoUpdate({ target: places.slug, set: excludedSet(places) })
    .returning({ id: places.id });

  /* Canonical dishes. */
  const canonicalIds = new Map<string, string>();
  for (const batch of chunks(data.canonicals)) {
    const rows = await db
      .insert(canonicalDishes)
      .values(
        batch.map((c) => ({
          ...published(),
          slug: c.slug.current,
          nameTh: c.name.th,
          nameEn: c.name.en,
          aliases: c.aliases ?? [],
          explainerTh: c.explainer?.th ?? null,
          explainerEn: c.explainer?.en ?? null,
        })),
      )
      .onConflictDoUpdate({ target: canonicalDishes.slug, set: excludedSet(canonicalDishes) })
      .returning({ id: canonicalDishes.id, slug: canonicalDishes.slug });
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
    for (const c of batch) canonicalIds.set(c._id, bySlug.get(c.slug.current)!);
  }

  /* Stalls. */
  const stallIds = new Map<string, string>();
  for (const batch of chunks(data.stalls)) {
    const rows = await db
      .insert(canteenStalls)
      .values(
        batch.map((s) => ({
          ...published(),
          slug: s.slug.current,
          nameTh: s.name.th,
          nameEn: s.name.en,
          number: s.number,
          cuisine: s.cuisine,
          halal: s.halal,
          vegetarianStall: s.vegetarianStall ?? false,
          hours: s.hours?.map((h) => ({ daysOfWeek: h.daysOfWeek, opens: h.opens, closes: h.closes })) ?? null,
          mapCol: s.mapCell.col,
          mapRow: s.mapCell.row,
          mapW: s.mapCell.w,
          mapH: s.mapCell.h,
          mapShape: s.mapCell.shape ?? "rect",
          wayfindingTh: s.wayfinding?.th ?? null,
          wayfindingEn: s.wayfinding?.en ?? null,
        })),
      )
      .onConflictDoUpdate({ target: canteenStalls.slug, set: excludedSet(canteenStalls, ["photoId"]) })
      .returning({ id: canteenStalls.id, slug: canteenStalls.slug });
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
    for (const s of batch) stallIds.set(s._id, bySlug.get(s.slug.current)!);
  }

  /* Dishes. */
  const dishIds = new Map<string, string>();
  for (const batch of chunks(data.dishes)) {
    const rows = await db
      .insert(canteenDishes)
      .values(
        batch.map((d) => ({
          ...published(),
          slug: d.slug.current,
          nameTh: d.name.th,
          nameEn: d.name.en,
          sayAs: (d.sayAs ?? []).map((p) => ({ th: p.th, romanised: p.romanised })),
          menuNumber: d.menuNumber ?? null,
          stallId: stallIds.get(d.stallId)!,
          canonicalId: d.canonicalId ? canonicalIds.get(d.canonicalId)! : null,
          price: d.price,
          type: d.type,
          course: d.course,
          protein: d.protein,
          contains: d.contains ?? [],
          style: d.style ?? null,
          temperature: d.temperature,
          wet: d.wet,
          vegetarian: d.vegetarian,
          checkedOn: d.checkedOn,
        })),
      )
      .onConflictDoUpdate({ target: canteenDishes.slug, set: excludedSet(canteenDishes, ["photoId"]) })
      .returning({ id: canteenDishes.id, slug: canteenDishes.slug });
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
    for (const d of batch) dishIds.set(d._id, bySlug.get(d.slug.current)!);
  }

  const allDishIds = [...dishIds.values()];
  const allStallIds = [...stallIds.values()];

  /* Variants and price history: replace the seeded children of every seeded dish. */
  for (const batch of chunks(allDishIds, 500)) {
    await db.delete(canteenDishVariants).where(inArray(canteenDishVariants.dishId, batch));
  }
  const variantRows = data.dishes.flatMap((d) =>
    (d.variants ?? []).map((v, position) => ({
      dishId: dishIds.get(d._id)!,
      position,
      labelTh: v.label.th,
      labelEn: v.label.en,
      delta: v.delta,
    })),
  );
  for (const batch of chunks(variantRows)) await db.insert(canteenDishVariants).values(batch);

  for (const batch of chunks(data.dishes)) {
    await db
      .insert(canteenDishPriceHistory)
      .values(batch.map((d) => ({ dishId: dishIds.get(d._id)!, price: d.price, checkedOn: SURVEY_DATE })))
      .onConflictDoUpdate({
        target: [canteenDishPriceHistory.dishId, canteenDishPriceHistory.checkedOn],
        set: excludedSet(canteenDishPriceHistory, ["dishId", "checkedOn"]),
      });
  }

  /* Add-ons (their dish links cascade away with them). */
  await db.delete(canteenStallAddOns).where(inArray(canteenStallAddOns.stallId, allStallIds));
  for (const stall of data.stalls) {
    for (const [position, addOn] of (stall.addOns ?? []).entries()) {
      const [row] = await db
        .insert(canteenStallAddOns)
        .values({
          stallId: stallIds.get(stall._id)!,
          position,
          labelTh: addOn.label.th,
          labelEn: addOn.label.en,
          delta: addOn.delta,
          courses: addOn.courses ?? [],
        })
        .returning({ id: canteenStallAddOns.id });
      const links = (addOn.dishIds ?? []).map((id) => ({ addOnId: row!.id, dishId: dishIds.get(id)! }));
      if (links.length > 0) await db.insert(canteenStallAddOnDishes).values(links);
    }
  }

  /* The floor plan singleton. */
  await db
    .insert(canteenSettings)
    .values({
      ...published(),
      singletonKey: "canteen",
      canteenPlaceId: place!.id,
      gridCols: settings.gridCols,
      gridRows: settings.gridRows,
      entrances: (settings.entrances ?? []).map((e) => ({ label: e.label, col: e.col, row: e.row, side: e.side })),
      seatingZones: (settings.seatingZones ?? []).map((z) => ({ label: z.label, col: z.col, row: z.row, w: z.w, h: z.h })),
      outline: (settings.outline ?? []).map((p) => ({ col: p.col, row: p.row })),
      landmarks: (settings.landmarks ?? []).map((l) => ({
        kind: l.kind,
        label: l.label,
        col: l.col,
        row: l.row,
        w: l.w,
        h: l.h,
      })),
      riverSide: settings.riverSide ?? null,
    })
    .onConflictDoUpdate({ target: canteenSettings.singletonKey, set: excludedSet(canteenSettings) });

}
