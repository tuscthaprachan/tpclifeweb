/**
 * Bilingual labels for every option value the canteen uses. One record per
 * enum, keyed by the same value the URL and the data use, so a new option
 * fails typecheck here until it has both languages.
 *
 *   label(DIET_LABEL, "nopork", locale)
 *
 * Diet FILTER labels live here, and the wording of a diet TAG on a dish in
 * `DIET_TAG_LABEL` below.
 */

import type { Locale } from "@/lib/i18n/config";
import { editableStrings } from "@/lib/i18n/editable";
import type {
  Allergen,
  CanteenCuisine,
  CookingStyle,
  DishType,
  Protein,
} from "@/lib/content/types";
import type { AvoidKey, DietKey, FeelKey, GroupKey, SortKey } from "@/lib/canteen/params";
import type { Bilingual } from "./strings";

/** Reads one language out of a label record. */
export function label<K extends string>(labels: Record<K, Bilingual>, key: K, locale: Locale): string {
  return labels[key][locale];
}

/** Diet filter options, as they read on the filter form and on filter chips. */
export const DIET_LABEL = editableStrings(
  "canteen-diet-filters",
  {
    nopork: { th: "ไม่มีหมู", en: "No pork" },
    nobeef: { th: "ไม่มีเนื้อวัว", en: "No beef" },
    nochicken: { th: "ไม่มีไก่", en: "No chicken" },
    noseafood: { th: "ไม่มีอาหารทะเล", en: "No seafood" },
    halal: { th: "ฮาลาล", en: "Halal" },
    vegetarian: { th: "มังสวิรัติ", en: "Vegetarian" },
  } satisfies Record<DietKey, Bilingual>,
  { th: "โรงอาหาร: ตัวเลือกอาหารที่กินได้ (ตัวกรอง)", en: "Canteen: diet options (filters)" },
);

/** Kept so callers written against the short name still compile. */
export const DIET_SHORT_LABEL = DIET_LABEL;

/** What a diet tag on a dish says. */
export const DIET_TAG_LABEL = editableStrings(
  "canteen-diet-tags",
  {
    halal: { th: "ฮาลาล", en: "Halal" },
    halalWholeStall: { th: "ร้านฮาลาล ทุกเมนูเป็นฮาลาล", en: "Halal stall: everything it sells is halal" },
    vegetarian: { th: "มังสวิรัติ", en: "Vegetarian" },
  },
  { th: "โรงอาหาร: ป้ายอาหารที่กินได้บนเมนู", en: "Canteen: diet tags on a dish" },
);

export const TYPE_LABEL = editableStrings(
  "canteen-dish-types",
  {
    rice: { th: "ข้าวจาน", en: "Rice dishes" },
    noodles: { th: "ก๋วยเตี๋ยวและเส้น", en: "Noodles" },
    soup: { th: "ซุปและต้ม", en: "Soup" },
    curryOverRice: { th: "ข้าวแกง", en: "Curry over rice" },
    madeToOrder: { th: "อาหารตามสั่ง", en: "Made to order" },
    singlePlate: { th: "อาหารจานเดียว", en: "Single plates" },
    snack: { th: "ของกินเล่น", en: "Snacks" },
    drink: { th: "เครื่องดื่ม", en: "Drinks" },
    dessert: { th: "ของหวาน", en: "Desserts" },
  } satisfies Record<DishType, Bilingual>,
  { th: "โรงอาหาร: ประเภทเมนู", en: "Canteen: types of dish" },
);

/** Singular wording, for a tag on one dish. */
export const TYPE_TAG_LABEL = editableStrings(
  "canteen-dish-type-tags",
  {
    rice: { th: "ข้าว", en: "Rice dish" },
    noodles: { th: "เส้น", en: "Noodles" },
    soup: { th: "ซุป", en: "Soup" },
    curryOverRice: { th: "ข้าวแกง", en: "Curry over rice" },
    madeToOrder: { th: "ตามสั่ง", en: "Made to order" },
    singlePlate: { th: "จานเดียว", en: "Single plate" },
    snack: { th: "ของกินเล่น", en: "Snack" },
    drink: { th: "เครื่องดื่ม", en: "Drink" },
    dessert: { th: "ของหวาน", en: "Dessert" },
  } satisfies Record<DishType, Bilingual>,
  { th: "โรงอาหาร: ประเภทเมนู (ป้ายบนเมนู)", en: "Canteen: type of dish (tag on a dish)" },
);

export const AVOID_LABEL = editableStrings(
  "canteen-avoid-options",
  {
    pork: { th: "ไม่เอาหมู", en: "No pork" },
    beef: { th: "ไม่เอาเนื้อวัว", en: "No beef" },
    seafood: { th: "ไม่เอาอาหารทะเล", en: "No seafood" },
    fish: { th: "ไม่เอาปลา", en: "No fish" },
    egg: { th: "ไม่เอาไข่", en: "No egg" },
    nuts: { th: "ไม่เอาถั่วทุกชนิด", en: "No nuts of any kind" },
    peanut: { th: "ไม่เอาถั่วลิสง", en: "No peanuts" },
    treeNut: { th: "ไม่เอาถั่วเปลือกแข็ง", en: "No tree nuts" },
    milk: { th: "ไม่เอานมและผลิตภัณฑ์นม", en: "No milk or dairy" },
    wheat: { th: "ไม่เอาแป้งสาลี", en: "No wheat or gluten" },
    soy: { th: "ไม่เอาถั่วเหลือง", en: "No soy" },
    sesame: { th: "ไม่เอางา", en: "No sesame" },
  } satisfies Record<AvoidKey, Bilingual>,
  { th: "โรงอาหาร: ตัวเลือกของที่ไม่เอา", en: "Canteen: leave-out options" },
);

export const ALLERGEN_LABEL = editableStrings(
  "canteen-allergens",
  {
    peanut: { th: "ถั่วลิสง", en: "Peanuts" },
    treeNut: { th: "ถั่วเปลือกแข็ง", en: "Tree nuts" },
    milk: { th: "นม", en: "Milk" },
    egg: { th: "ไข่", en: "Egg" },
    wheat: { th: "แป้งสาลี", en: "Wheat" },
    soy: { th: "ถั่วเหลือง", en: "Soy" },
    sesame: { th: "งา", en: "Sesame" },
    fish: { th: "ปลาหรือน้ำปลา", en: "Fish or fish sauce" },
    shellfish: { th: "กุ้ง ปู หอย หมึก หรือกะปิ", en: "Shellfish or shrimp paste" },
  } satisfies Record<Allergen, Bilingual>,
  { th: "โรงอาหาร: ชื่อสารก่อภูมิแพ้", en: "Canteen: allergen names" },
);

export const FEEL_LABEL = editableStrings(
  "canteen-feel-options",
  {
    hot: { th: "เสิร์ฟร้อน", en: "Served hot" },
    cold: { th: "เสิร์ฟเย็น", en: "Served cold" },
    soupy: { th: "มีน้ำ", en: "Soupy" },
    dry: { th: "แห้ง", en: "Dry" },
    fried: { th: "ผัดหรือทอด", en: "Fried" },
    notFried: { th: "ไม่ผัดไม่ทอด", en: "Not fried" },
  } satisfies Record<FeelKey, Bilingual>,
  { th: "โรงอาหาร: ตัวเลือกอารมณ์ตอนนี้", en: "Canteen: feel options" },
);

export const SORT_LABEL = editableStrings(
  "canteen-sort-options",
  {
    price: { th: "ราคาถูกก่อน", en: "Cheapest first" },
    name: { th: "ชื่อ ก ถึง ฮ", en: "Name, A to Z" },
    stall: { th: "เลขร้าน", en: "Stall number" },
  } satisfies Record<SortKey, Bilingual>,
  { th: "โรงอาหาร: ตัวเลือกการเรียง", en: "Canteen: sort options" },
);

export const GROUP_LABEL = editableStrings(
  "canteen-group-options",
  {
    none: { th: "ไม่จัดกลุ่ม", en: "No grouping" },
    stall: { th: "ตามร้าน", en: "By stall" },
    canonical: { th: "ตามเมนู เทียบราคาแต่ละร้าน", en: "By dish, to compare prices" },
  } satisfies Record<GroupKey, Bilingual>,
  { th: "โรงอาหาร: ตัวเลือกการจัดกลุ่ม", en: "Canteen: group-by options" },
);

export const CUISINE_LABEL = editableStrings(
  "canteen-cuisines",
  {
    thaiRice: { th: "ข้าวราดแกง", en: "Thai rice dishes" },
    madeToOrder: { th: "อาหารตามสั่ง", en: "Made to order" },
    noodles: { th: "ก๋วยเตี๋ยว", en: "Noodles" },
    isan: { th: "อาหารอีสาน", en: "Isan food" },
    chickenRice: { th: "ข้าวมันไก่", en: "Chicken rice" },
    curryOverRice: { th: "ข้าวแกง", en: "Curry over rice" },
    muslim: { th: "อาหารมุสลิม", en: "Muslim food" },
    international: { th: "อาหารนานาชาติ", en: "International food" },
    drinks: { th: "เครื่องดื่ม", en: "Drinks" },
    desserts: { th: "ของหวาน", en: "Desserts" },
    fruit: { th: "ผลไม้", en: "Fruit" },
  } satisfies Record<CanteenCuisine, Bilingual>,
  { th: "โรงอาหาร: ประเภทอาหารของร้าน", en: "Canteen: cuisines of a stall" },
);

export const PROTEIN_LABEL = editableStrings(
  "canteen-proteins",
  {
    pork: { th: "หมู", en: "Pork" },
    chicken: { th: "ไก่", en: "Chicken" },
    beef: { th: "เนื้อวัว", en: "Beef" },
    seafood: { th: "อาหารทะเล", en: "Seafood" },
    fish: { th: "ปลา", en: "Fish" },
    egg: { th: "ไข่", en: "Egg" },
    tofu: { th: "เต้าหู้", en: "Tofu" },
    none: { th: "ไม่มีเนื้อสัตว์", en: "No meat" },
  } satisfies Record<Protein, Bilingual>,
  { th: "โรงอาหาร: ชนิดโปรตีน", en: "Canteen: protein types" },
);

export const STYLE_LABEL = editableStrings(
  "canteen-cooking-styles",
  {
    stirFried: { th: "ผัด", en: "Stir-fried" },
    deepFried: { th: "ทอด", en: "Deep-fried" },
    boiled: { th: "ต้มหรือน้ำซุป", en: "Boiled or soup" },
    grilled: { th: "ย่างหรือปิ้ง", en: "Grilled" },
    steamed: { th: "นึ่ง", en: "Steamed" },
    salad: { th: "ยำหรือสลัด", en: "Salad" },
    curry: { th: "แกง", en: "Curry" },
  } satisfies Record<CookingStyle, Bilingual>,
  { th: "โรงอาหาร: วิธีปรุง", en: "Canteen: cooking styles" },
);

/** Labels for the removable chip of a budget filter and similar single-value filters. */
const CHIP_LABELS = editableStrings(
  "canteen-chip-labels",
  {
    open: { th: "เปิดอยู่ตามเวลาทำการ", en: "Open by scheduled hours" },
    variants: { th: "นับราคาพิเศษ", en: "Special price counted" },
  },
  { th: "โรงอาหาร: ป้ายตัวกรองที่เอาออกได้", en: "Canteen: removable filter chips" },
);
export const OPEN_CHIP_LABEL: Bilingual = CHIP_LABELS.open;
export const VARIANTS_CHIP_LABEL: Bilingual = CHIP_LABELS.variants;
