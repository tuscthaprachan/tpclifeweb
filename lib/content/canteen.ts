import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { emptyCanteenData, normaliseCanteenData } from "@/lib/canteen/derive";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  canonicalDishes,
  canteenDishes,
  canteenDishVariants,
  canteenSettings,
  canteenStallAddOnDishes,
  canteenStallAddOns,
  canteenStalls,
  places,
} from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { toCampusPlace } from "./directory";
import { loadImages } from "./images";
import { ci, groupBy, iso, ls, lsOpt, ltOpt, opt, optList, withKeys } from "./map";
import { safeFetchResult } from "./safe-fetch";
import type { CanteenData, CanteenSettings } from "./types";

/**
 * The whole canteen dataset in one read: around 300 dishes, roughly 40 KB as
 * JSON. One cached read feeds every page and is shipped once to the client, so
 * filtering is instant and the server and client run the same code on the same
 * data. Child tables are read whole rather than by id, since the dataset is
 * read whole anyway.
 *
 * IDS. `dish.stallId` and `dish.canonicalId` are the stall's and canonical
 * dish's `_id`, not expanded records: expanding them would copy each stall
 * into every one of its dishes and bloat the payload sent to the browser.
 * `lib/canteen/derive.ts` joins them once with `indexCanteen(data)`. The one
 * relation that IS expanded is the settings' `canteen` place, because the
 * opening hours live on it and only one copy exists.
 *
 * Published rows only. A dish whose stall is unpublished is dropped by
 * `normaliseCanteenData`.
 */
export async function readCanteenData(db: AuditExecutor): Promise<CanteenData> {
  const [settingsRows, stallRows, dishRows, canonicalRows, variantRows, addOnRows, addOnDishRows] = await Promise.all([
    db.select().from(canteenSettings).where(eq(canteenSettings.status, "published")).limit(1),
    db.select().from(canteenStalls).where(eq(canteenStalls.status, "published")).orderBy(asc(canteenStalls.number)),
    db.select().from(canteenDishes).where(eq(canteenDishes.status, "published")).orderBy(ci(canteenDishes.nameEn), canteenDishes.slug),
    db.select().from(canonicalDishes).where(eq(canonicalDishes.status, "published")).orderBy(ci(canonicalDishes.nameEn), canonicalDishes.slug),
    db.select().from(canteenDishVariants).orderBy(asc(canteenDishVariants.position)),
    db.select().from(canteenStallAddOns).orderBy(asc(canteenStallAddOns.position)),
    db.select().from(canteenStallAddOnDishes),
  ]);

  const settingsRow = settingsRows[0];
  const [placeRow] = settingsRow?.canteenPlaceId
    ? await db
        .select()
        .from(places)
        .where(and(eq(places.status, "published"), eq(places.id, settingsRow.canteenPlaceId)))
        .limit(1)
    : [];
  const imageById = await loadImages(db, [...stallRows.map((s) => s.photoId), ...dishRows.map((d) => d.photoId)]);

  const variantsByDish = groupBy(variantRows, (v) => v.dishId);
  const addOnsByStall = groupBy(addOnRows, (a) => a.stallId);
  const dishesByAddOn = groupBy(addOnDishRows, (l) => l.addOnId);

  const settings: CanteenSettings | null = settingsRow
    ? {
        _id: settingsRow.id,
        _type: "canteenSettings",
        _createdAt: iso(settingsRow.createdAt),
        _updatedAt: iso(settingsRow.updatedAt),
        canteen: placeRow ? toCampusPlace(placeRow) : undefined,
        gridCols: settingsRow.gridCols,
        gridRows: settingsRow.gridRows,
        entrances: withKeys(settingsRow.entrances),
        seatingZones: withKeys(settingsRow.seatingZones),
        outline: withKeys(settingsRow.outline),
        landmarks: withKeys(settingsRow.landmarks),
        riverSide: opt(settingsRow.riverSide),
      }
    : null;

  return {
    settings,
    stalls: stallRows.map((row) => ({
      _id: row.id,
      _type: "canteenStall",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      name: ls(row.nameTh, row.nameEn),
      slug: { current: row.slug },
      number: row.number,
      cuisine: row.cuisine,
      halal: row.halal,
      vegetarianStall: row.vegetarianStall,
      addOns: optList(
        (addOnsByStall.get(row.id) ?? []).map((addOn) => ({
          _key: addOn.id,
          label: ls(addOn.labelTh, addOn.labelEn),
          delta: addOn.delta,
          courses: optList(addOn.courses),
          dishIds: optList((dishesByAddOn.get(addOn.id) ?? []).map((l) => l.dishId)),
        })),
      ),
      hours: row.hours && row.hours.length > 0 ? withKeys(row.hours) : undefined,
      mapCell: {
        col: row.mapCol,
        row: row.mapRow,
        w: row.mapW,
        h: row.mapH,
        ...(row.mapShape !== "rect" ? { shape: row.mapShape } : {}),
      },
      wayfinding: lsOpt(row.wayfindingTh, row.wayfindingEn),
      photo: row.photoId ? imageById.get(row.photoId) : undefined,
    })),
    dishes: dishRows.map((row) => ({
      _id: row.id,
      _type: "canteenDish",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      name: ls(row.nameTh, row.nameEn),
      sayAs: row.sayAs.length > 0 ? withKeys(row.sayAs) : undefined,
      menuNumber: opt(row.menuNumber),
      slug: { current: row.slug },
      stallId: row.stallId,
      canonicalId: opt(row.canonicalId),
      price: row.price,
      variants: (variantsByDish.get(row.id) ?? []).map((v) => ({
        _key: v.id,
        label: ls(v.labelTh, v.labelEn),
        delta: v.delta,
      })),
      type: row.type,
      course: row.course,
      protein: row.protein,
      contains: optList(row.contains),
      style: opt(row.style),
      temperature: row.temperature,
      wet: row.wet,
      vegetarian: row.vegetarian,
      photo: row.photoId ? imageById.get(row.photoId) : undefined,
      checkedOn: row.checkedOn,
      lastReviewed: opt(row.lastReviewed),
    })),
    canonicals: canonicalRows.map((row) => ({
      _id: row.id,
      _type: "canonicalDish",
      _createdAt: iso(row.createdAt),
      _updatedAt: iso(row.updatedAt),
      name: ls(row.nameTh, row.nameEn),
      slug: { current: row.slug },
      aliases: optList(row.aliases),
      explainer: ltOpt(row.explainerTh, row.explainerEn),
    })),
  };
}

const cachedCanteen = cachedRead(
  ["canteen"],
  [CACHE_TAGS.canteen, CACHE_TAGS.place, CACHE_TAGS.image],
  REVALIDATE.content,
  () => readCanteenData(getDb()),
);

/**
 * The canteen dataset, normalised (missing lists become empty, dishes that
 * point at a missing stall are dropped).
 *
 * The database is the source. The surveyed dataset in `lib/canteen/dataset.ts`
 * is used only as the fallback when the database cannot be READ, so /eat keeps
 * showing the real stalls and menus through an outage. An empty database is
 * not an outage: it returns an empty canteen, and the pages say so.
 *
 * Memoised per request, so a page and its `generateMetadata` share one read.
 */
export const getCanteenData = cache(async (): Promise<CanteenData> => {
  if (process.env.NODE_ENV !== "production" && process.env.CANTEEN_FIXTURE === "1") {
    const { makeData } = await import("@/tests/unit/canteen/fixture");
    return makeData();
  }
  const result = await safeFetchResult<CanteenData | null>("getCanteenData", () => cachedCanteen(), null);
  if (!result.ok) return normaliseCanteenData(surveyCanteenData());
  return result.data ? normaliseCanteenData(result.data) : emptyCanteenData();
});
