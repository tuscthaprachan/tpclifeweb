/**
 * A FICTIONAL canteen for the unit tests. None of these stalls or dishes
 * exist: the names are "Fixture stall 1", "Fixture dish A" and so on, the
 * prices are made up to exercise the logic, and nothing here may ever be
 * shown to a reader as real survey data.
 *
 * Layout on the fictional floor plan (col, row):
 *
 *   row 0:  stall 1 (0,0)   stall 2 (2,0)   stall 3 (4,0)
 *   row 2:  stall 4 (0,2)   stall 5 (2,2)   stall 6 (4,2)
 *
 * The walking order is by stall number, 1 to 6, wherever a stall is drawn.
 */

import type {
  CanonicalDish,
  CanteenData,
  CanteenDish,
  CanteenSettings,
  CanteenStall,
  HalalStatus,
} from "@/lib/sanity/types";

const META = { _createdAt: "2026-01-01T00:00:00.000Z", _updatedAt: "2026-01-01T00:00:00.000Z" };

export const NOW = new Date("2026-08-10T09:00:00+07:00"); // a Monday, 09:00 in Bangkok

function stall(
  number: number,
  col: number,
  row: number,
  extra: Partial<CanteenStall> = {},
  halal: HalalStatus = "none",
): CanteenStall {
  return {
    _id: `stall-${number}`,
    _type: "canteenStall",
    ...META,
    name: { th: `ร้านตัวอย่าง ${number}`, en: `Fixture stall ${number}` },
    slug: { _type: "slug", current: `fixture-stall-${number}` },
    number,
    cuisine: ["thaiRice"],
    halal,
    mapCell: { col, row, w: 2, h: 1 },
    ...extra,
  };
}

export const STALLS: CanteenStall[] = [
  stall(1, 0, 0),
  stall(2, 2, 0, { cuisine: ["noodles"], halalCheckedOn: "2026-01-02" }, "stallDeclared"),
  stall(3, 4, 0, { halalCheckedOn: "2026-01-02" }, "certified"),
  stall(4, 0, 2, {
    vegetarianStall: true,
    hours: [{ _key: "h", daysOfWeek: [1, 2, 3, 4, 5], opens: "10:00", closes: "12:00" }],
  }),
  stall(5, 2, 2, { cuisine: ["drinks", "desserts"] }),
  stall(6, 4, 2),
];

export const CANONICALS: CanonicalDish[] = [
  {
    _id: "canon-basil",
    _type: "canonicalDish",
    ...META,
    name: { th: "จานตัวอย่าง ก", en: "Fixture basil dish" },
    slug: { _type: "slug", current: "fixture-basil" },
  },
  {
    _id: "canon-noodle",
    _type: "canonicalDish",
    ...META,
    name: { th: "จานตัวอย่าง ข", en: "Fixture noodle dish" },
    slug: { _type: "slug", current: "fixture-noodle" },
  },
];

function dish(stallNumber: number, price: number, extra: Partial<CanteenDish> & { id: string }): CanteenDish {
  const { id, ...rest } = extra;
  return {
    _id: `dish-${id}`,
    _type: "canteenDish",
    ...META,
    name: { th: `เมนูตัวอย่าง ${id}`, en: `Fixture dish ${id}` },
    slug: { _type: "slug", current: `fixture-dish-${id}` },
    stall: { _type: "reference", _ref: `stall-${stallNumber}` },
    price,
    variants: [],
    type: "rice",
    course: "main",
    protein: ["chicken"],
    style: "stirFried",
    spice: 1,
    temperature: "hot",
    wet: false,
    vegetarian: "no",
    vegan: "no",
    jay: "no",
    checkedOn: "2026-08-01",
    ...rest,
  };
}

const ref = (id: string) => ({ _type: "reference" as const, _ref: id });

export const DISHES: CanteenDish[] = [
  // Stall 1: rice, a pork dish, a chicken dish, one with a special.
  dish(1, 40, { id: "a", protein: ["pork"], canonical: ref("canon-basil"), spice: 2 }),
  dish(1, 45, { id: "b", protein: ["chicken", "egg"], canonical: ref("canon-basil"), spice: 2, variants: [{ _key: "v1", label: { th: "พิเศษ", en: "Special" }, delta: 10 }] }),
  dish(1, 50, { id: "c", protein: ["beef"], style: "grilled", type: "singlePlate", spice: 0 }),
  dish(1, 35, { id: "d", protein: ["egg"], type: "madeToOrder", spice: 0, vegetarian: "canAsk" }),
  // Stall 2: noodles and soup, halal (stall says).
  dish(2, 45, { id: "e", type: "noodles", protein: ["chicken"], wet: true, style: "boiled", canonical: ref("canon-noodle"), spice: 1 }),
  dish(2, 55, { id: "f", type: "noodles", protein: ["beef"], wet: true, style: "boiled", spice: 2 }),
  dish(2, 40, { id: "g", type: "soup", protein: ["fish"], wet: true, style: "boiled", spice: 0 }),
  dish(2, 50, { id: "h", type: "noodles", protein: ["seafood"], wet: false, style: "stirFried", spice: 3 }),
  // Stall 3: certified halal, curry over rice and rice.
  dish(3, 60, { id: "i", type: "curryOverRice", protein: ["beef"], style: "curry", wet: true, spice: 2 }),
  dish(3, 45, { id: "j", type: "rice", protein: ["chicken"], canonical: ref("canon-basil"), spice: 2 }),
  dish(3, 70, { id: "k", type: "madeToOrder", protein: ["seafood"], spice: 1 }),
  // Stall 4: vegetarian stall, own hours 10:00 to 12:00.
  dish(4, 40, { id: "l", protein: ["tofu"], vegetarian: "yes", vegan: "yes", jay: "yes", spice: 0 }),
  dish(4, 50, { id: "m", type: "noodles", protein: ["egg"], vegetarian: "yes", vegan: "canAsk", jay: "canAsk", wet: true, style: "boiled", spice: 1 }),
  dish(4, 30, { id: "n", type: "snack", course: "side", protein: ["tofu"], style: "deepFried", vegetarian: "yes", vegan: "yes", spice: 0 }),
  // Stall 5: drinks and desserts.
  dish(5, 15, { id: "o", type: "drink", course: "drink", protein: ["none"], temperature: "cold", style: "steamed", spice: 0, vegetarian: "yes", wet: true }),
  dish(5, 20, { id: "p", type: "drink", course: "drink", protein: ["none"], temperature: "cold", style: "steamed", spice: 0, vegetarian: "yes", vegan: "yes", jay: "yes", wet: true }),
  dish(5, 25, { id: "q", type: "dessert", course: "dessert", protein: ["none"], temperature: "cold", style: "steamed", spice: 0, vegetarian: "yes" }),
  dish(5, 10, { id: "r", type: "dessert", course: "dessert", protein: ["none"], style: "steamed", spice: 0, vegetarian: "yes", vegan: "yes" }),
  // Stall 6: a second basil dish, pork, and a cheap rice.
  dish(6, 50, { id: "s", protein: ["pork", "egg"], canonical: ref("canon-basil"), spice: 3 }),
  dish(6, 38, { id: "t", protein: ["pork"], spice: 1 }),
  dish(6, 65, { id: "u", type: "singlePlate", protein: ["fish"], style: "deepFried", spice: 1 }),
];

export const SETTINGS: CanteenSettings = {
  _id: "canteenSettings",
  _type: "canteenSettings",
  ...META,
  canteen: {
    _id: "place-fixture-canteen",
    _type: "place",
    ...META,
    name: { th: "โรงอาหารตัวอย่าง", en: "Fixture canteen" },
    slug: { _type: "slug", current: "fixture-canteen" },
    category: "welfare",
    openingHours: [{ _key: "c", daysOfWeek: [1, 2, 3, 4, 5], opens: "08:00", closes: "15:00" }],
  },
  gridCols: 6,
  gridRows: 4,
  entrances: [{ _key: "e1", label: { th: "ทางเข้าตัวอย่าง", en: "Fixture entrance" }, col: 0, row: 0, side: "north" }],
  seatingZones: [
    { _key: "z1", label: { th: "โซนตัวอย่าง 1", en: "Fixture zone 1" }, col: 0, row: 3, w: 2, h: 1 },
    { _key: "z2", label: { th: "โซนตัวอย่าง 2", en: "Fixture zone 2" }, col: 4, row: 3, w: 2, h: 1 },
  ],
  riverSide: "east",
  jayFestivalStart: "2026-10-18",
  jayFestivalEnd: "2026-10-26",
};

/** A fresh copy of the fictional dataset. Each call returns new objects, so tests can mutate freely. */
export function makeData(overrides: Partial<CanteenData> = {}): CanteenData {
  return structuredClone({
    settings: SETTINGS,
    stalls: STALLS,
    dishes: DISHES,
    canonicals: CANONICALS,
    ...overrides,
  }) as CanteenData;
}

/** Slugs of a dish list, for compact assertions. */
export function slugs(dishes: readonly CanteenDish[]): string[] {
  return dishes.map((d) => d.slug.current.replace("fixture-dish-", ""));
}
