/**
 * Every string of the What to eat service, in Thai and English.
 *
 * Neither language is a translation of the other, and the casual voice that
 * CONTRIBUTING.md allows in this one section is used sparingly. No em dashes.
 * Honesty rules are built into the wording: prices are surveyed figures with
 * a date, diet tags are the stall's word unless certified, nothing is live.
 *
 * Plain module, no "use client": safe from server and client components.
 *
 *   import { EAT, eat, t } from "@/components/domain/canteen/strings";
 *   t(EAT.tabDishes, locale)      // static string
 *   eat.resultCount(locale, 23, 9) // string with numbers in it
 *
 * Option labels (diet, type, avoid, feel, sort, group, cuisine,
 * protein, style, halal) live in `labels.ts`.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

export interface Bilingual {
  th: string;
  en: string;
}

/** Reads one language out of a bilingual record. */
export function t(text: Bilingual, locale: Locale): string {
  return text[locale];
}

export const EAT = {
  /* ---- Section ---- */
  title: { th: "กินอะไรดี", en: "What to eat" },
  intro: {
    th: "เลือกเมนูในโรงอาหารจากราคา อาหารที่กินได้ และอารมณ์ตอนนี้ หรือให้เราสุ่มให้ก็ได้",
    en: "Pick something at the canteen by price, diet and mood. Or let us choose for you.",
  },
  pricesCheckedBetween: { th: "ตรวจราคาระหว่าง", en: "Prices checked between" },
  andWord: { th: "ถึง", en: "and" },
  surveyNote: {
    th: "ราคามาจากการสำรวจ ไม่ใช่ข้อมูลสด ทุกราคาบอกวันที่ตรวจไว้",
    en: "Prices come from our survey, not a live feed. Every price shows the day it was checked.",
  },
  dietNote: {
    th: "ป้ายอาหารเป็นคำบอกของร้าน ไม่ใช่การรับรอง ยกเว้นที่ระบุว่ามีใบรับรอง น้ำซุปและซอสไม่ได้ถูกบันทึก ถามร้านก่อนสั่งเสมอ",
    en: "Diet tags are what the stall told us, not a guarantee, unless marked certified. Broths and sauces are not tracked, so ask the stall before you order.",
  },
  allergyNote: {
    th: "เดาจากชื่อเมนูและสูตรทั่วไป รวมซอสและแป้งชุบ จึงอาจพลาดได้ ร้านไม่ได้ยืนยัน ถ้าแพ้อาหาร ถามร้านก่อนสั่งเสมอ",
    en: "Guessed from dish names and usual recipes, sauces and batters included, so some will be missed. The stalls have not confirmed them. If you have an allergy, always ask the stall before you order.",
  },

  /* ---- Tabs and tools ---- */
  tabsLabel: { th: "วิธีดูเมนู", en: "Ways to browse" },
  tabDishes: { th: "เมนู", en: "Dishes" },
  tabStalls: { th: "ร้านค้า", en: "Stalls" },
  tabMap: { th: "แผนที่", en: "Map" },
  toolsTitle: { th: "เครื่องมือช่วยเลือก", en: "Tools" },
  toolMeal: { th: "มื้อนี้งบเท่านี้", en: "Meal for my budget" },
  toolMealHint: { th: "บอกงบ เราจัดชุดอาหารให้", en: "Tell us your budget, we build a meal." },
  toolWeek: { th: "วางแผนทั้งสัปดาห์", en: "Plan my week" },
  toolWeekHint: { th: "มื้อกลางวันครบทุกวัน ไม่เกินงบ", en: "A lunch for every day, within budget." },
  toolGroup: { th: "กินเป็นกลุ่ม", en: "Eat as a group" },
  toolGroupHint: { th: "หาร้านที่ทุกคนในกลุ่มกินได้", en: "Find a stall that works for everyone." },
  toolWhatIs: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
  toolWhatIsHint: { th: "อธิบายเมนูสำหรับคนที่ไม่เคยกิน", en: "Explainers for dishes you have never had." },
  toolMine: { th: "ของฉัน", en: "My stuff" },
  toolMineHint: { th: "เมนูโปรดและประวัติ เก็บไว้ในเครื่องนี้", en: "Favourites and history, kept on this device." },

  /* ---- Decide for me ---- */
  decideTitle: { th: "ไม่รู้จะกินอะไร", en: "Can't decide?" },
  decideHint: {
    th: "เลือกงบกับอาหารที่กินได้ แล้วเราจะเลือกเมนูให้",
    en: "Pick a budget and a diet, and we will choose a dish.",
  },
  decideButton: { th: "เลือกให้หน่อย", en: "Decide for me" },
  decideWithThese: { th: "เลือกให้ จากตัวกรองนี้", en: "Decide for me with these" },
  budgetLegend: { th: "งบต่อจาน", en: "Budget per dish" },
  budgetAny: { th: "ไม่จำกัด", en: "Any" },
  budgetOther: { th: "หรือใส่จำนวนเอง (บาท)", en: "Or type an amount (baht)" },
  dietLegend: { th: "อาหารที่กินได้", en: "Diet" },

  /* ---- Hub ---- */
  glanceTitle: { th: "โรงอาหารโดยสรุป", en: "The canteen at a glance" },
  browseTitle: { th: "เลือกดูเอง", en: "Browse" },
  startersTitle: { th: "เมนูราคาเบา ๆ ให้เริ่ม", en: "Easy on the wallet" },
  seeAllDishes: { th: "ดูเมนูทั้งหมด", en: "See all dishes" },
  jayBannerTitle: { th: "ช่วงเทศกาลกินเจ", en: "It is jay festival time" },
  jayBannerBody: {
    th: "มองหาป้ายเจ และขอให้ร้านทำเมนูแบบไม่มีเนื้อสัตว์ได้ ร้านอาจต้องใช้เวลาเพิ่ม",
    en: "Look for the jay tag, and ask stalls to make dishes without meat. Some stalls may need a little longer.",
  },
  jayBannerAction: { th: "ดูเมนูเจ", en: "Show jay dishes" },
  noDataTitle: { th: "เรายังไม่ได้สำรวจโรงอาหาร", en: "We have not surveyed the canteen yet" },
  noDataBody: {
    th: "เมนูและราคาจะขึ้นที่นี่หลังสำรวจเสร็จ ระหว่างนี้ดูป้ายเมนูหน้าร้านได้เลย",
    en: "Menus and prices will show up here once the survey is done. Until then, the boards at each stall are the best guide.",
  },

  /* ---- Filters ---- */
  filtersTitle: { th: "ตัวกรอง", en: "Filters" },
  editFilters: { th: "แก้ตัวกรอง", en: "Edit filters" },
  filterBarLabel: { th: "ตัวกรองที่ใช้อยู่", en: "Active filters" },
  noFilters: { th: "กำลังแสดงทุกเมนู", en: "Showing everything" },
  clearAll: { th: "ล้างตัวกรองทั้งหมด", en: "Clear all filters" },
  removeFilter: { th: "เอาตัวกรองออก", en: "Remove filter" },
  applyShort: { th: "ใช้ตัวกรอง", en: "Apply filters" },
  displayLegend: { th: "การแสดงผล", en: "Display" },
  budgetFilterLegend: { th: "งบ", en: "Budget" },
  budgetFilterHint: { th: "ราคาสูงสุดต่อจาน", en: "Highest price per dish" },
  variantsLabel: { th: "นับราคาพิเศษและท็อปปิ้งด้วย", en: "Count the special and extras price too" },
  dietFilterLegend: { th: "อาหารที่กินได้", en: "Diet" },
  dietFilterHint: { th: "ตามที่ร้านแจ้ง", en: "As the stall says" },
  typeLegend: { th: "ประเภทเมนู", en: "Type of dish" },
  avoidLegend: { th: "ไม่เอา", en: "Leave out" },
  feelLegend: { th: "อารมณ์ตอนนี้", en: "Feel" },
  stallLabel: { th: "ร้าน", en: "Stall" },
  stallAny: { th: "ทุกร้าน", en: "All stalls" },
  openLegend: { th: "เวลาทำการ", en: "Hours" },
  openLabel: { th: "ร้านที่เปิดอยู่ตามเวลาทำการ", en: "Open now, by scheduled hours" },
  openHint: {
    th: "ดูจากเวลาทำการที่ประกาศไว้ ไม่รู้ว่าร้านหยุดวันนี้หรือไม่",
    en: "Based on published hours. We cannot tell if a stall is shut today.",
  },
  sortLabel: { th: "เรียงตาม", en: "Sort by" },
  groupLabel: { th: "จัดกลุ่มตาม", en: "Group by" },

  /* ---- Results ---- */
  resultsTitle: { th: "ผลลัพธ์", en: "Results" },
  dishesTitle: { th: "เมนูทั้งหมด", en: "All dishes" },
  dishesIntro: {
    th: "กรองตามราคา อาหารที่กินได้ และประเภท ตัวเลขในวงเล็บคือจำนวนเมนูที่จะได้",
    en: "Filter by price, diet and type. The number in brackets is how many dishes you would get.",
  },
  stallsTitle: { th: "ร้านค้าในโรงอาหาร", en: "Stalls in the canteen" },
  stallsIntro: {
    th: "เรียงตามเลขร้าน ซึ่งไล่ตามลำดับที่เดินผ่านในโรงอาหาร",
    en: "In stall number order, which follows the way you walk through the hall.",
  },
  noResultsTitle: { th: "ไม่เจอเมนูที่ตรงกับตัวกรอง", en: "No dishes match those filters" },
  relaxTitle: { th: "ลองแบบนี้ดู", en: "Try one of these" },
  relaxWithoutBudget: { th: "เอาเรื่องงบออก", en: "Remove the budget limit" },
  relaxWithoutVariants: { th: "นับเฉพาะราคาปกติ", en: "Count only the base price" },
  noResultsStalls: { th: "ไม่มีเมนูที่ตรงกับตัวกรอง", en: "No matching dishes" },
  cheapestWord: { th: "ถูกที่สุด", en: "Cheapest" },
  thisOne: { th: "จานนี้", en: "This one" },
  compareTitle: { th: "เมนูเดียวกัน ร้านอื่น", en: "Same dish, other stalls" },
  compareNote: {
    th: "เรียงจากราคาถูกไปแพง เป็นราคาที่สำรวจ ไม่ได้ยืนยันวันนี้",
    en: "Cheapest first. Surveyed prices, not confirmed today.",
  },
  otherDishes: { th: "เมนูอื่น ๆ", en: "Other dishes" },
  pageWord: { th: "หน้า", en: "Page" },

  /* ---- Dish card and page ---- */
  priceCheckedOn: { th: "ตรวจราคาเมื่อ", en: "Price checked on" },
  checkedShort: { th: "ตรวจเมื่อ", en: "Checked" },
  optionsTitle: { th: "ตัวเลือกและราคาเพิ่ม", en: "Options and extras" },
  extrasFrom: { th: "มีราคาเพิ่ม", en: "Extras available" },
  baseWord: { th: "ราคาปกติ", en: "Base price" },
  stallWord: { th: "ร้าน", en: "Stall" },
  priceTitle: { th: "ราคา", en: "Price" },
  whereTitle: { th: "ไปกินที่ไหน", en: "Where to find it" },
  aboutTitle: { th: "เกี่ยวกับเมนูนี้", en: "About this dish" },
  proteinLine: { th: "โปรตีน", en: "Protein" },
  containsLine: { th: "น่าจะมี (เดาจากชื่อเมนู)", en: "Probably contains (guessed from the name)" },
  typeLine: { th: "ประเภท", en: "Type" },
  styleLine: { th: "วิธีปรุง", en: "Cooking style" },
  temperatureLine: { th: "อุณหภูมิ", en: "Served" },
  dietTitle: { th: "อาหารที่กินได้", en: "Diet" },
  noDietTags: { th: "ร้านไม่ได้แจ้งป้ายอาหารพิเศษ", en: "The stall gave no special diet tags." },
  whatIsLink: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
  showOnMap: { th: "ดูตำแหน่งบนแผนที่", en: "Show on the map" },
  backToStalls: { th: "กลับไปรายการร้านค้า", en: "Back to all stalls" },
  backToDishes: { th: "กลับไปรายการเมนู", en: "Back to all dishes" },
  hot: { th: "ร้อน", en: "Hot" },
  cold: { th: "เย็น", en: "Cold" },
  soupyWord: { th: "มีน้ำหรือซอส", en: "Soupy or saucy" },
  dryWord: { th: "แห้ง", en: "Dry" },
  stallThing: { th: "ร้านนี้", en: "This stall" },

  /* ---- Stall card and page ---- */
  stallNumberWord: { th: "ร้านที่", en: "Stall" },
  dishCountWord: { th: "เมนู", en: "dishes" },
  menuTitle: { th: "เมนูทั้งหมดของร้าน", en: "Full menu" },
  wayfindingTitle: { th: "หาร้านเจอได้อย่างไร", en: "How to find it" },
  noWayfinding: { th: "ยังไม่มีคำอธิบายทางเดิน ดูเลขร้านบนแผนที่", en: "No directions yet. Look for the stall number on the map." },
  vegetarianStall: { th: "ร้านมังสวิรัติ", en: "Vegetarian stall" },
  noMenuYet: {
    th: "แผงนี้ยังไม่มีร้าน จึงยังไม่มีเมนู",
    en: "There is no shop in this stall yet, so there is no menu.",
  },
  halalAsked: { th: "ถามร้านเมื่อ", en: "asked on" },
  stallMatches: { th: "ตรงกับตัวกรองของคุณ", en: "match your filters" },
  viewStall: { th: "ดูเมนูร้านนี้", en: "See this stall's menu" },

  /* ---- Favourite toggle ---- */
  favouriteLabel: { th: "เมนูโปรด", en: "Favourite" },
  favouriteFailed: { th: "เก็บไม่ได้ ที่เก็บข้อมูลในเบราว์เซอร์ถูกปิดอยู่", en: "Could not save. Browser storage is switched off." },

} as const satisfies Record<string, Bilingual>;

export type EatKey = keyof typeof EAT;

/* ------------------------------------------------------------------ *
 * Strings with numbers in them. Each returns the finished string.
 * ------------------------------------------------------------------ */

const n = formatNumber;

export const eat = {
  /** "45 baht" / "45 บาท". */
  baht(locale: Locale, amount: number): string {
    return locale === "th" ? `${n(amount, locale)} บาท` : `${n(amount, locale)} baht`;
  },

  /** "from 25 baht". */
  fromBaht(locale: Locale, amount: number): string {
    return locale === "th" ? `เริ่ม ${n(amount, locale)} บาท` : `from ${n(amount, locale)} baht`;
  },

  /** "+10 baht". */
  plusBaht(locale: Locale, amount: number): string {
    return locale === "th" ? `เพิ่ม ${n(amount, locale)} บาท` : `+${n(amount, locale)} baht`;
  },

  /** "under 50 baht". */
  underBaht(locale: Locale, amount: number): string {
    return locale === "th" ? `ไม่เกิน ${n(amount, locale)} บาท` : `under ${n(amount, locale)} baht`;
  },

  /** "23 dishes at 9 stalls". Announced politely when it changes. */
  resultCount(locale: Locale, dishes: number, stalls: number): string {
    if (locale === "th") return `${n(dishes, locale)} เมนู จาก ${n(stalls, locale)} ร้าน`;
    return `${n(dishes, locale)} ${dishes === 1 ? "dish" : "dishes"} at ${n(stalls, locale)} ${stalls === 1 ? "stall" : "stalls"}`;
  },

  /** "14 dishes". */
  dishCount(locale: Locale, count: number): string {
    if (locale === "th") return `${n(count, locale)} เมนู`;
    return `${n(count, locale)} ${count === 1 ? "dish" : "dishes"}`;
  },

  /** "3 filters". */
  filterCount(locale: Locale, count: number): string {
    if (locale === "th") return `${n(count, locale)} ตัวกรอง`;
    return `${n(count, locale)} ${count === 1 ? "filter" : "filters"}`;
  },

  /** "Edit filters (3)". */
  editFiltersWithCount(locale: Locale, count: number): string {
    const base = locale === "th" ? "แก้ตัวกรอง" : "Edit filters";
    return count > 0 ? `${base} (${n(count, locale)})` : base;
  },

  /** "Show 23 dishes". The submit button of the filter form. */
  showDishes(locale: Locale, count: number): string {
    return locale === "th" ? `ดู ${n(count, locale)} เมนู` : `Show ${n(count, locale)} ${count === 1 ? "dish" : "dishes"}`;
  },

  /** "Raise your budget to 60 baht for 8 dishes". */
  relaxRaise(locale: Locale, budget: number, count: number): string {
    return locale === "th"
      ? `เพิ่มงบเป็น ${n(budget, locale)} บาท ได้ ${n(count, locale)} เมนู`
      : `Raise your budget to ${n(budget, locale)} baht for ${n(count, locale)} ${count === 1 ? "dish" : "dishes"}`;
  },

  /** `Drop "cold" for 5 dishes`. */
  relaxDrop(locale: Locale, label: string, count: number): string {
    return locale === "th"
      ? `เอา "${label}" ออก ได้ ${n(count, locale)} เมนู`
      : `Drop "${label}" for ${n(count, locale)} ${count === 1 ? "dish" : "dishes"}`;
  },

  /** A relax suggestion with no named value, for example the budget. */
  relaxGeneric(locale: Locale, action: string, count: number): string {
    return locale === "th"
      ? `${action} ได้ ${n(count, locale)} เมนู`
      : `${action} for ${n(count, locale)} ${count === 1 ? "dish" : "dishes"}`;
  },

  /** "Scheduled hours: open until 15:00". Never "open now": hours are a published schedule. */
  openUntil(locale: Locale, time: string): string {
    return locale === "th" ? `ตามเวลาทำการ เปิดถึง ${time} น.` : `Scheduled hours: open until ${time}.`;
  },

  /** "214 dishes from 25 baht". */
  dishesFrom(locale: Locale, count: number, price: number): string {
    return locale === "th"
      ? `${n(count, locale)} เมนู เริ่มต้น ${n(price, locale)} บาท`
      : `${n(count, locale)} ${count === 1 ? "dish" : "dishes"} from ${n(price, locale)} baht.`;
  },

  /** "A plate of rice usually costs about 45 baht". */
  ricePlate(locale: Locale, price: number): string {
    return locale === "th"
      ? `ข้าวหนึ่งจานราคากลางประมาณ ${n(price, locale)} บาท`
      : `A plate of rice usually costs about ${n(price, locale)} baht.`;
  },

  /** "Stall 3". */
  stallNumber(locale: Locale, number: number): string {
    return locale === "th" ? `ร้านที่ ${n(number, locale)}` : `Stall ${n(number, locale)}`;
  },

  /** "Stall 3 · Fixture stall". A middle dot, never a dash. */
  stallFull(locale: Locale, number: number, name: string): string {
    return `${eat.stallNumber(locale, number)} · ${name}`;
  },

  /** "3 stalls". */
  atStalls(locale: Locale, count: number): string {
    return locale === "th" ? `${n(count, locale)} ร้าน` : `${n(count, locale)} ${count === 1 ? "stall" : "stalls"}`;
  },

  /** "5 of 12 dishes match your filters". */
  stallMatchCount(locale: Locale, matching: number, total: number): string {
    return locale === "th"
      ? `${n(matching, locale)} จาก ${n(total, locale)} เมนูตรงกับตัวกรองของคุณ`
      : `${n(matching, locale)} of ${n(total, locale)} ${total === 1 ? "dish matches" : "dishes match"} your filters`;
  },

  /** "Price range 30 to 60 baht". */
  priceRange(locale: Locale, min: number, max: number): string {
    if (min === max) return eat.baht(locale, min);
    return locale === "th"
      ? `${n(min, locale)} ถึง ${n(max, locale)} บาท`
      : `${n(min, locale)} to ${n(max, locale)} baht`;
  },

  /** "Options for Fixture dish". */
  dishAtStall(locale: Locale, dish: string, stall: string): string {
    return locale === "th" ? `${dish} ที่${stall}` : `${dish} at ${stall}`;
  },

  /** "9 of 12 stalls", or "12 stalls" when no filter is on. */
  stallsShown(locale: Locale, shown: number, total: number, filtered: boolean): string {
    if (!filtered) return eat.atStalls(locale, total);
    return locale === "th"
      ? `${n(shown, locale)} จาก ${n(total, locale)} ร้านมีเมนูที่ตรงกับตัวกรอง`
      : `${n(shown, locale)} of ${n(total, locale)} stalls have matching dishes`;
  },

  /** "Page 2 of 5" is provided by ui Pagination; this is the "showing" line under the list. */
  showingRange(locale: Locale, from: number, to: number, total: number): string {
    return locale === "th"
      ? `แสดงเมนูที่ ${n(from, locale)} ถึง ${n(to, locale)} จาก ${n(total, locale)}`
      : `Showing ${n(from, locale)} to ${n(to, locale)} of ${n(total, locale)}`;
  },
};
