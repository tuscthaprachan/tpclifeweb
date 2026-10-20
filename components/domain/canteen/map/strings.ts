/**
 * Copy for the canteen map, in both languages. Each language is written as
 * itself, not translated from the other. Everything is a surveyed floor
 * plan, so nothing here implies live data.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenCuisine } from "@/lib/sanity/types";

type Pair = { th: string; en: string };

export const MAP_STRINGS = {
  eatTitle: { th: "กินอะไรดี", en: "What to eat" },
  pageTitle: { th: "ผังโรงอาหาร", en: "Canteen map" },
  pageIntro: {
    th: "ดูว่าร้านแต่ละร้านอยู่ตรงไหนในโรงอาหาร เรียงตามลำดับที่เดินผ่าน",
    en: "See where each stall is in the canteen, listed in the order you walk past them.",
  },
  svgTitle: { th: "ผังพื้นของโรงอาหาร", en: "Canteen floor plan" },
  svgDesc: {
    th: "ภาพประกอบเสริม รายชื่อร้านที่เรียงตามลำดับการเดินมีข้อมูลเดียวกัน",
    en: "A supplementary drawing. The list of stalls in walking order holds the same information.",
  },
  listHeading: { th: "ร้านในโรงอาหาร ตามลำดับการเดิน", en: "Stalls in walking order" },
  listNote: {
    th: "เรียงจากแถวบนไปล่าง และจากซ้ายไปขวา",
    en: "Ordered from the top row down, and left to right within a row.",
  },
  mapHeading: { th: "ผังพื้น", en: "Floor plan" },
  key: { th: "คำอธิบายสัญลักษณ์", en: "Key" },
  keySeating: { th: "พื้นที่เส้นประคือโซนที่นั่ง", en: "Dashed areas are seating zones." },
  keyStops: {
    th: "วงกลมเลขในผังคือลำดับที่แนะนำให้เดินไปแต่ละร้าน",
    en: "Numbered circles on the plan give a suggested order to visit the stalls.",
  },
  surveyNote: {
    th: "ตำแหน่งมาจากการสำรวจ ร้านอาจย้ายที่ภายหลัง",
    en: "Positions come from a survey. A stall may have moved since.",
  },
  stall: { th: "ร้านที่", en: "Stall" },
  stallNumber: (n: number, locale: Locale) => (locale === "th" ? `ร้านที่ ${n}` : `Stall ${n}`),
  openStall: { th: "ดูรายละเอียดร้าน", en: "View stall" },
  noWayfinding: { th: "ยังไม่มีคำบอกทาง", en: "No directions recorded yet" },
  entrance: { th: "ทางเข้า", en: "Entrance" },
  entranceHeading: { th: "ทางเข้า", en: "Entrances" },
  entranceKey: (n: number) => `E${n}`,
  seatingZone: { th: "โซนที่นั่ง", en: "Seating" },
  riverSide: { th: "ฝั่งแม่น้ำ", en: "River side" },
  routeFrom: (label: string, locale: Locale) => (locale === "th" ? `เส้นทางเริ่มจาก${label}` : `Route starts at ${label}`),
  stop: (n: number, locale: Locale) => (locale === "th" ? `จุดที่ ${n}` : `Stop ${n}`),
  stopOf: (n: number, total: number, locale: Locale) =>
    locale === "th" ? `จุดที่ ${n} จาก ${total}` : `Stop ${n} of ${total}`,
  highlighted: { th: "ร้านที่เลือก", en: "Selected stall" },
  matchCount: (n: number, locale: Locale) => {
    const count = formatNumber(n, locale);
    if (locale === "th") return n === 0 ? "ไม่มีเมนูที่ตรง" : `${count} เมนูที่ตรง`;
    return n === 0 ? "No matching dishes" : n === 1 ? "1 matching dish" : `${count} matching dishes`;
  },
  noMatchShort: { th: "ไม่ตรง", en: "None" },
  matchSummary: (n: number, locale: Locale) => {
    if (locale === "th") return n === 0 ? "ยังไม่มีร้านที่มีเมนูตรงกับที่เลือก" : `มี ${formatNumber(n, locale)} ร้านที่มีเมนูตรงกับที่เลือก`;
    if (n === 0) return "No stall has something that matches.";
    return n === 1 ? "1 stall has something that matches." : `${formatNumber(n, locale)} stalls have something that matches.`;
  },
  matchHint: {
    th: "ตัวเลขบนร้านคือจำนวนเมนูที่ตรงกับตัวกรอง ร้านที่จางและมีลายเส้นเฉียงไม่มีเมนูที่ตรง",
    en: "The number on a stall is how many dishes match your filters. A faded stall with diagonal lines has none.",
  },
  changeFilters: { th: "เปลี่ยนตัวกรอง", en: "Change the filters" },
  backToEat: { th: "กลับไปหน้ากินอะไรดี", en: "Back to What to eat" },
  emptyTitle: { th: "ยังไม่ได้สำรวจผังโรงอาหาร", en: "The canteen floor plan has not been surveyed yet" },
  emptyBody: {
    th: "เมื่อสำรวจร้านและตำแหน่งแล้ว ผังจะแสดงที่นี่",
    en: "Once the stalls and their positions are surveyed, the plan will appear here.",
  },
  cuisine: {
    thaiRice: { th: "ข้าวจานเดียว", en: "Thai rice dishes" },
    madeToOrder: { th: "อาหารตามสั่ง", en: "Made to order" },
    noodles: { th: "ก๋วยเตี๋ยว", en: "Noodles" },
    isan: { th: "อาหารอีสาน", en: "Isan food" },
    chickenRice: { th: "ข้าวมันไก่", en: "Chicken rice" },
    curryOverRice: { th: "ข้าวราดแกง", en: "Curry over rice" },
    muslim: { th: "อาหารมุสลิม", en: "Muslim food" },
    international: { th: "อาหารนานาชาติ", en: "International food" },
    drinks: { th: "เครื่องดื่ม", en: "Drinks" },
    desserts: { th: "ของหวาน", en: "Desserts" },
    fruit: { th: "ผลไม้", en: "Fruit" },
  } satisfies Record<CanteenCuisine, Pair>,
} as const;

export function cuisineLabel(cuisine: CanteenCuisine, locale: Locale): string {
  return MAP_STRINGS.cuisine[cuisine]?.[locale] ?? "";
}
