/**
 * The "50 baht noodles" search shortcut: a number followed by baht or บาท,
 * optionally with a dish type word, becomes a link to the canteen dishes
 * filtered by that budget (`/eat/dishes?max=50&type=noodles`).
 *
 * Deliberately strict. After the amount and a few filler words ("under",
 * "ไม่เกิน") are taken out, everything left must be a known dish type word.
 * "50 baht fee form" matches nothing, so the callout never hijacks an
 * unrelated search. Pure.
 */

import { DISH_TYPES } from "@/lib/canteen/options";
import { MAX_BUDGET, defaultFilters, withFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { DishType } from "@/lib/sanity/types";

export interface CanteenShortcut {
  /** Highest price per dish, in baht. */
  max: number;
  /** Dish types named in the query, in canonical order. Empty means any. */
  types: DishType[];
}

/** Words that mean a type, in English and Thai. Matched whole, after a plural "s" is dropped. */
const TYPE_WORDS: Record<string, DishType> = {
  rice: "rice",
  ข้าว: "rice",
  ข้าวจาน: "rice",
  noodle: "noodles",
  noodles: "noodles",
  ก๋วยเตี๋ยว: "noodles",
  เส้น: "noodles",
  บะหมี่: "noodles",
  soup: "soup",
  ซุป: "soup",
  ต้ม: "soup",
  curry: "curryOverRice",
  แกง: "curryOverRice",
  ข้าวแกง: "curryOverRice",
  ข้าวราดแกง: "curryOverRice",
  ตามสั่ง: "madeToOrder",
  อาหารตามสั่ง: "madeToOrder",
  จานเดียว: "singlePlate",
  อาหารจานเดียว: "singlePlate",
  snack: "snack",
  snacks: "snack",
  ของว่าง: "snack",
  ของกินเล่น: "snack",
  drink: "drink",
  drinks: "drink",
  เครื่องดื่ม: "drink",
  น้ำ: "drink",
  dessert: "dessert",
  desserts: "dessert",
  ขนม: "dessert",
  ของหวาน: "dessert",
};

/** Filler that may appear around the amount without changing the meaning. */
const FILLER = /(?:^|\s)(?:under|below|less than|up to|within|max|maximum|for|food|dishes|dish|meals?|ไม่เกิน|ต่ำกว่า|ราคา|เมนู|อาหาร|ไม่เกิน)(?=\s|$)/g;

const AMOUNT = /(?:฿\s*(\d{1,4}))|(?:(\d{1,4})\s*(?:baht|bahts|thb|บาท|฿))/;

/**
 * Reads a search query as a canteen budget shortcut, or returns null when it
 * is anything else. "50 baht", "under 50 baht noodles", "noodles 50 บาท",
 * "ข้าว ไม่เกิน 60 บาท" and "฿40" all match.
 */
export function parseCanteenShortcut(query: string): CanteenShortcut | null {
  const text = query.normalize("NFC").toLowerCase().trim();
  const match = AMOUNT.exec(text);
  if (!match) return null;
  const max = Number(match[1] ?? match[2]);
  if (!Number.isInteger(max) || max < 1 || max > MAX_BUDGET) return null;

  const rest = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
    .replace(FILLER, " ")
    .replace(/[,.;:!?]/g, " ");
  const found = new Set<DishType>();
  for (const word of rest.split(/\s+/).filter(Boolean)) {
    const type = TYPE_WORDS[word] ?? TYPE_WORDS[word.replace(/s$/, "")];
    if (!type) return null;
    found.add(type);
  }
  return { max, types: DISH_TYPES.filter((type) => found.has(type)) };
}

/** The dishes link for a shortcut, for example `/en/eat/dishes?max=50&type=noodles`. */
export function canteenShortcutHref(locale: Locale, shortcut: CanteenShortcut): string {
  return withFilters(localePath(locale, "/eat/dishes"), { ...defaultFilters(), max: shortcut.max, type: shortcut.types });
}
