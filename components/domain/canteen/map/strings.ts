/**
 * Copy for the canteen map, in both languages. Each language is written as
 * itself, not translated from the other. Everything is a surveyed floor
 * plan, so nothing here implies live data.
 */

import { editableStrings, fillText } from "@/lib/i18n/editable";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenCuisine } from "@/lib/content/types";
import { CUISINE_LABEL } from "../labels";

const MAP_TEXT = editableStrings(
  "canteen-map",
  {
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
    openStall: { th: "ดูรายละเอียดร้าน", en: "View stall" },
    noWayfinding: { th: "ยังไม่มีคำบอกทาง", en: "No directions recorded yet" },
    entrance: { th: "ทางเข้า", en: "Entrance" },
    entranceHeading: { th: "ทางเข้า", en: "Entrances" },
    seatingZone: { th: "โซนที่นั่ง", en: "Seating" },
    riverSide: { th: "ฝั่งแม่น้ำ", en: "River side" },
    highlighted: { th: "ร้านที่เลือก", en: "Selected stall" },
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
  },
  { th: "โรงอาหาร: ผังโรงอาหาร", en: "Canteen: floor plan" },
);

/** The wording of the strings that carry numbers or names, with {placeholders} filled in by the functions below. */
const PHRASE = editableStrings(
  "canteen-map-phrases",
  {
    svgMarked: { th: "ร้านที่ทำเครื่องหมายในผัง: {names}", en: "Marked on the plan: {names}." },
    stallNumber: { th: "ร้านที่ {number}", en: "Stall {number}" },
    routeFrom: { th: "เส้นทางเริ่มจาก{label}", en: "Route starts at {label}" },
    stop: { th: "จุดที่ {number}", en: "Stop {number}" },
    stopOf: { th: "จุดที่ {number} จาก {total}", en: "Stop {number} of {total}" },
    matchCountNone: { th: "ไม่มีเมนูที่ตรง", en: "No matching dishes" },
    matchCountOne: { th: "{count} เมนูที่ตรง", en: "1 matching dish" },
    matchCountMany: { th: "{count} เมนูที่ตรง", en: "{count} matching dishes" },
    matchSummaryNone: { th: "ยังไม่มีร้านที่มีเมนูตรงกับที่เลือก", en: "No stall has something that matches." },
    matchSummaryOne: { th: "มี {count} ร้านที่มีเมนูตรงกับที่เลือก", en: "1 stall has something that matches." },
    matchSummaryMany: { th: "มี {count} ร้านที่มีเมนูตรงกับที่เลือก", en: "{count} stalls have something that matches." },
  },
  { th: "โรงอาหาร: ผังโรงอาหาร ข้อความที่มีตัวเลขและชื่อแทรก", en: "Canteen: floor plan, texts with numbers and names in them" },
);

export const MAP_STRINGS = {
  // The entries are the live dictionary entries, so an edit in the console still shows.
  ...MAP_TEXT,
  svgMarked: (names: readonly string[], locale: Locale) =>
    fillText(PHRASE.svgMarked[locale], { names: names.join(locale === "th" ? ", " : "; ") }),
  stallNumber: (n: number, locale: Locale) => fillText(PHRASE.stallNumber[locale], { number: n }),
  entranceKey: (n: number) => `E${n}`,
  routeFrom: (label: string, locale: Locale) => fillText(PHRASE.routeFrom[locale], { label }),
  stop: (n: number, locale: Locale) => fillText(PHRASE.stop[locale], { number: n }),
  stopOf: (n: number, total: number, locale: Locale) => fillText(PHRASE.stopOf[locale], { number: n, total }),
  matchCount: (n: number, locale: Locale) => {
    if (n === 0) return PHRASE.matchCountNone[locale];
    return fillText((n === 1 ? PHRASE.matchCountOne : PHRASE.matchCountMany)[locale], { count: formatNumber(n, locale) });
  },
  matchSummary: (n: number, locale: Locale) => {
    if (n === 0) return PHRASE.matchSummaryNone[locale];
    return fillText((n === 1 ? PHRASE.matchSummaryOne : PHRASE.matchSummaryMany)[locale], { count: formatNumber(n, locale) });
  },
};

export function cuisineLabel(cuisine: CanteenCuisine, locale: Locale): string {
  return CUISINE_LABEL[cuisine]?.[locale] ?? "";
}
