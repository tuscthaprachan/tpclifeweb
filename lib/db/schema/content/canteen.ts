import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns, type LocaleStringJson, type OpeningHoursJson } from "./common";
import { images } from "./images";
import { places } from "./directory";
import {
  allergenEnum,
  canteenCuisineEnum,
  cookingStyleEnum,
  dishCourseEnum,
  dishTypeEnum,
  floorSideEnum,
  mapShapeEnum,
  proteinEnum,
  temperatureEnum,
} from "./enums";

/**
 * The canteen ("What to eat"). Around 300 dishes, all read in one go and
 * shipped to the client, so the shape favours a cheap full read: enum arrays
 * (cuisine, protein, contains) are columns, not join tables; only things with
 * foreign keys or history are child tables.
 *
 * HONESTY: every price is a surveyed figure with a
 * `checked_on` date; there is no allergen guarantee and no operational signal.
 */

export const canteenStalls = pgTable(
  "canteen_stalls",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    /** As painted on the stall. */
    number: integer("number").notNull().unique(),
    cuisine: canteenCuisineEnum("cuisine").array().notNull().default(sql`'{}'`),
    halal: boolean("halal").notNull().default(false),
    vegetarianStall: boolean("vegetarian_stall").notNull().default(false),
    /** Optional. When null or empty the canteen's hours apply. Rendered whole. */
    hours: jsonb("hours").$type<OpeningHoursJson[]>(),
    /** Floor plan cell: columns and rows count from 0 at the top left. */
    mapCol: integer("map_col").notNull(),
    mapRow: integer("map_row").notNull(),
    mapW: integer("map_w").notNull().default(1),
    mapH: integer("map_h").notNull().default(1),
    mapShape: mapShapeEnum("map_shape").notNull().default("rect"),
    wayfindingTh: text("wayfinding_th"),
    wayfindingEn: text("wayfinding_en"),
    photoId: uuid("photo_id").references(() => images.id, { onDelete: "set null" }),
  },
  (t) => [
    check("canteen_stalls_map_cell", sql`${t.mapCol} >= 0 and ${t.mapRow} >= 0 and ${t.mapW} >= 1 and ${t.mapH} >= 1`),
    index("canteen_stalls_listing_idx").on(t.status, t.number),
  ],
);

/** The taxonomy layer: one per real-world dish, not per stall. */
export const canonicalDishes = pgTable(
  "canonical_dishes",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    /** Alternative spellings that feed search. */
    aliases: text("aliases").array().notNull().default(sql`'{}'`),
    explainerTh: text("explainer_th"),
    explainerEn: text("explainer_en"),
    /** Phrases to show at the stall: { th, romanised, en }. Rendered whole. */
    howToOrder: jsonb("how_to_order")
      .$type<Array<{ th: string; romanised: string; en: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
  },
  (t) => [index("canonical_dishes_listing_idx").on(t.status, t.nameEn)],
);

export interface SayPhraseJson {
  th: string;
  romanised: string;
}

export const canteenDishes = pgTable(
  "canteen_dishes",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    /** What to say to order it: one phrase, or one per choice. Rendered whole. */
    sayAs: jsonb("say_as").$type<SayPhraseJson[]>().notNull().default(sql`'[]'::jsonb`),
    /** The number the stall's board gives the dish, when it numbers its menu. */
    menuNumber: text("menu_number"),
    stallId: uuid("stall_id")
      .notNull()
      .references(() => canteenStalls.id, { onDelete: "cascade" }),
    canonicalId: uuid("canonical_id").references(() => canonicalDishes.id, { onDelete: "set null" }),
    /** Baht, the base price as surveyed. */
    price: integer("price").notNull(),
    type: dishTypeEnum("type").notNull(),
    course: dishCourseEnum("course").notNull(),
    protein: proteinEnum("protein").array().notNull().default(sql`'{}'`),
    /** Allergens it probably contains. Inferred, never a guarantee. */
    contains: allergenEnum("contains").array().notNull().default(sql`'{}'`),
    /** Null for drinks, desserts and anything not cooked to order. */
    style: cookingStyleEnum("style"),
    temperature: temperatureEnum("temperature").notNull().default("hot"),
    wet: boolean("wet").notNull().default(false),
    vegetarian: boolean("vegetarian").notNull().default(false),
    photoId: uuid("photo_id").references(() => images.id, { onDelete: "set null" }),
    /** The day the current price was last checked. */
    checkedOn: date("checked_on", { mode: "string" }).notNull(),
    lastReviewed: date("last_reviewed", { mode: "string" }),
  },
  (t) => [
    check("canteen_dishes_price_nonneg", sql`${t.price} >= 0`),
    index("canteen_dishes_stall_idx").on(t.stallId),
    index("canteen_dishes_canonical_idx").on(t.canonicalId),
    index("canteen_dishes_listing_idx").on(t.status, t.nameEn),
    index("canteen_dishes_course_idx").on(t.course),
    index("canteen_dishes_checked_on_idx").on(t.checkedOn),
  ],
);

/** A priced variant ("special" +10). Delta is never negative. */
export const canteenDishVariants = pgTable(
  "canteen_dish_variants",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => canteenDishes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    labelTh: text("label_th").notNull().default(""),
    labelEn: text("label_en").notNull().default(""),
    delta: integer("delta").notNull(),
  },
  (t) => [
    unique("canteen_dish_variants_position").on(t.dishId, t.position),
    check("canteen_dish_variants_delta_nonneg", sql`${t.delta} >= 0`),
  ],
);

/** Append-only evidence for the price tracker (`priceHistory` in the dataset). */
export const canteenDishPriceHistory = pgTable(
  "canteen_dish_price_history",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => canteenDishes.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    checkedOn: date("checked_on", { mode: "string" }).notNull(),
  },
  (t) => [
    unique("canteen_dish_price_history_unique").on(t.dishId, t.checkedOn),
    check("canteen_dish_price_history_nonneg", sql`${t.price} >= 0`),
  ],
);

/**
 * A topping or extra a stall sells only with something else. With neither
 * `courses` nor rows in canteen_stall_add_on_dishes it goes with every item
 * at the stall. A child table (not jsonb) because it references dishes.
 */
export const canteenStallAddOns = pgTable(
  "canteen_stall_add_ons",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    stallId: uuid("stall_id")
      .notNull()
      .references(() => canteenStalls.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    labelTh: text("label_th").notNull().default(""),
    labelEn: text("label_en").notNull().default(""),
    delta: integer("delta").notNull(),
    /** Only items of these courses. Empty means no course restriction. */
    courses: dishCourseEnum("courses").array().notNull().default(sql`'{}'`),
  },
  (t) => [unique("canteen_stall_add_ons_position").on(t.stallId, t.position)],
);

export const canteenStallAddOnDishes = pgTable(
  "canteen_stall_add_on_dishes",
  {
    addOnId: uuid("add_on_id")
      .notNull()
      .references(() => canteenStallAddOns.id, { onDelete: "cascade" }),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => canteenDishes.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.addOnId, t.dishId] }), index("canteen_stall_add_on_dishes_dish_idx").on(t.dishId)],
);

export interface CanteenEntranceJson {
  label: LocaleStringJson;
  col: number;
  row: number;
  side: "north" | "south" | "east" | "west";
}
export interface CanteenSeatingZoneJson {
  label: LocaleStringJson;
  col: number;
  row: number;
  w: number;
  h: number;
}
export interface CanteenOutlinePointJson {
  col: number;
  row: number;
}
export interface CanteenLandmarkJson {
  kind: "stairs" | "lifts" | "toilets" | "atm" | "lobby";
  label: LocaleStringJson;
  col: number;
  row: number;
  w: number;
  h: number;
}

/**
 * Canteen settings singleton: the floor plan. Entrances, seating zones, the
 * building outline and landmarks are jsonb because they are one drawing,
 * edited and rendered as a unit and never queried by field.
 */
export const canteenSettings = pgTable(
  "canteen_settings",
  {
    ...contentColumns(),
    singletonKey: text("singleton_key").notNull().default("canteen"),
    /** The canteen `place`, which carries the opening hours and the location. */
    canteenPlaceId: uuid("canteen_place_id").references(() => places.id, { onDelete: "set null" }),
    gridCols: integer("grid_cols").notNull(),
    gridRows: integer("grid_rows").notNull(),
    entrances: jsonb("entrances").$type<CanteenEntranceJson[]>().notNull().default(sql`'[]'::jsonb`),
    seatingZones: jsonb("seating_zones").$type<CanteenSeatingZoneJson[]>().notNull().default(sql`'[]'::jsonb`),
    outline: jsonb("outline").$type<CanteenOutlinePointJson[]>().notNull().default(sql`'[]'::jsonb`),
    landmarks: jsonb("landmarks").$type<CanteenLandmarkJson[]>().notNull().default(sql`'[]'::jsonb`),
    riverSide: floorSideEnum("river_side"),
  },
  (t) => [
    check("canteen_settings_singleton", sql`${t.singletonKey} = 'canteen'`),
    unique("canteen_settings_singleton_key").on(t.singletonKey),
    check("canteen_settings_grid", sql`${t.gridCols} >= 1 and ${t.gridRows} >= 1`),
  ],
);

export type CanteenStallRow = typeof canteenStalls.$inferSelect;
export type CanteenDishRow = typeof canteenDishes.$inferSelect;
export type CanonicalDishRow = typeof canonicalDishes.$inferSelect;
export type CanteenSettingsRow = typeof canteenSettings.$inferSelect;
