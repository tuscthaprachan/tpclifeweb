/**
 * Copy for the canteen map, in both languages. Each language is written as
 * itself, not translated from the other. Everything is a surveyed floor
 * plan, so nothing here implies live data.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenCuisine } from "@/lib/content/types";

type Pair = { th: string; en: string };

export const MAP_STRINGS = {
  pageTitle: { th: "ผังโรงอาหาร", en: "Canteen map" },
  pageIntro: {
    th: "หาร้านแต่ละร้านบนผังโรงอาหาร หรือสลับไปดูเป็นรายชื่อก็ได้",
    en: "Find each stall on the floor plan, or switch to the list.",
  },
  svgTitle: { th: "แผนผังโรงอาหาร", en: "Canteen floor plan" },
  svgDesc: {
    th: "ภาพประกอบเสริม รายชื่อร้านที่เรียงตามเลขร้านมีข้อมูลเดียวกัน",
    en: "A supplementary drawing. The list of stalls in stall number order holds the same information.",
  },
  svgMarked: (names: readonly string[], locale: Locale) =>
    locale === "th" ? `ร้านที่ทำเครื่องหมายในผัง: ${names.join(", ")}` : `Marked on the plan: ${names.join("; ")}.`,
  viewSwitchLabel: { th: "มุมมองของหน้านี้", en: "View of this page" },
  viewPlan: { th: "ผัง", en: "Plan" },
  viewList: { th: "รายชื่อร้าน", en: "List" },
  scrollRegion: { th: "ผังโรงอาหาร เลื่อนไปทางซ้ายและขวาเพื่อดูทั้งผัง", en: "Canteen floor plan. Scroll sideways to see all of it." },
  scrollHint: { th: "เลื่อนผังไปทางซ้ายและขวาเพื่อดูทั้งผัง แตะร้านเพื่อดูรายละเอียด", en: "Scroll the plan sideways to see all of it. Tap a stall to open it." },
  seeList: { th: "ดูร้านทั้งหมดเป็นรายชื่อ", en: "See every stall as a list" },
  listHeading: { th: "ร้านในโรงอาหาร ตามเลขร้าน", en: "Stalls in stall number order" },
  mapHeading: { th: "แผนผัง", en: "Floor plan" },
  key: { th: "คำอธิบายสัญลักษณ์", en: "Key" },
  keySeating: { th: "พื้นที่เส้นประคือโซนที่นั่ง", en: "Dashed areas are seating zones." },
  keyStops: {
    th: "วงกลมเลขในผังคือลำดับที่แนะนำให้เดินไปแต่ละร้าน",
    en: "Numbered circles on the plan give a suggested order to visit the stalls.",
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
  matchSummary: (n: number, locale: Locale) => {
    if (locale === "th") return n === 0 ? "ยังไม่มีร้านที่มีเมนูตรงกับที่เลือก" : `มี ${formatNumber(n, locale)} ร้านที่มีเมนูตรงกับที่เลือก`;
    if (n === 0) return "No stall has something that matches.";
    return n === 1 ? "1 stall has something that matches." : `${formatNumber(n, locale)} stalls have something that matches.`;
  },
  matchHint: {
    th: "ตัวเลขบนร้านคือจำนวนเมนูที่ตรงกับตัวกรอง ร้านที่จางและมีลายเส้นเฉียงไม่มีเมนูที่ตรง",
    en: "The number on a stall is how many dishes match your filters. A faded stall with diagonal lines has none.",
  },
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
