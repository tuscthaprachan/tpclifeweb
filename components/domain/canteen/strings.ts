/**
 * Every string of the What to eat service, in Thai and English.
 *
 * Neither language is a translation of the other, and the casual voice that
 * CONTRIBUTING.md allows in this one section is used sparingly. No em dashes.
 * Honesty rules are built into the wording: prices are surveyed figures with
 * a date, diet tags are a guide to check at the stall, nothing is live.
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
import { editableStrings, fillText } from "@/lib/i18n/editable";
import { formatNumber } from "@/lib/i18n/format";

export interface Bilingual {
  th: string;
  en: string;
}

/** Reads one language out of a bilingual record. */
export function t(text: Bilingual, locale: Locale): string {
  return text[locale];
}

export const EAT = editableStrings(
  "canteen-main",
  {
    /* ---- Section ---- */
    title: { th: "กินอะไรดี", en: "What to eat" },
    intro: {
      th: "เลือกเมนูในโรงอาหารจากราคา อาหารที่กินได้ และอารมณ์ตอนนี้ หรือให้เราสุ่มให้ก็ได้",
      en: "Pick something at the canteen by price, diet and mood. Or let us choose for you.",
    },

    /* ---- Tabs and tools ---- */
    tabsLabel: { th: "วิธีดูเมนู", en: "Ways to browse" },
    tabDishes: { th: "เมนู", en: "Dishes" },
    tabStalls: { th: "ร้านค้า", en: "Stalls" },
    tabMap: { th: "แผนที่", en: "Map" },
    toolsTitle: { th: "เครื่องมือช่วยเลือก", en: "Tools" },
    toolPlan: { th: "วางแผนมื้ออาหาร", en: "Plan a meal" },
    toolPlanHint: {
      th: "มื้อนี้ตามงบ ทั้งสัปดาห์ หรือกินเป็นกลุ่ม",
      en: "One meal on your budget, a whole week, or a group.",
    },
    planTitle: { th: "วางแผนมื้ออาหาร", en: "Plan a meal" },
    planIntro: {
      th: "จัดมื้อตามงบ วางแผนทั้งสัปดาห์ หรือหาร้านที่ทุกคนในกลุ่มกินได้",
      en: "Build a meal on your budget, plan the week, or find a stall that works for a group.",
    },
    planModesLabel: { th: "เลือกแบบที่จะวางแผน", en: "What to plan" },
    planModeMeal: { th: "มื้อนี้", en: "This meal" },
    planModeWeek: { th: "ทั้งสัปดาห์", en: "The week" },
    planModeGroup: { th: "กินเป็นกลุ่ม", en: "A group" },
    toolWhatIs: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
    toolWhatIsHint: { th: "อธิบายเมนูสำหรับคนที่ไม่เคยกิน", en: "Explainers for dishes you have never had." },
    toolMine: { th: "ของฉัน", en: "Your stuff" },
    toolMineHint: { th: "เมนูโปรดและประวัติ เก็บไว้ในเครื่องนี้", en: "Favourites and history, kept on this device." },

    /* ---- Decide for me ---- */
    decideTitle: { th: "ไม่รู้จะกินอะไร", en: "Can't decide?" },
    decideHint: {
      th: "เลือกงบกับอาหารที่กินได้ แล้วเราจะเลือกเมนูให้",
      en: "Pick a budget and a diet, and we will choose a dish.",
    },
    decideButton: { th: "เลือกให้หน่อย", en: "Decide for me" },
    decideWithThese: { th: "เลือกให้จากตัวกรองนี้", en: "Decide for me with these" },
    budgetLegend: { th: "งบต่อจาน", en: "Budget per dish" },
    budgetAny: { th: "ไม่จำกัด", en: "Any" },
    budgetOther: { th: "จำนวนเงิน (บาท)", en: "Amount in baht" },
    budgetOtherChoice: { th: "จำนวนอื่น", en: "Other" },
    dietLegend: { th: "อาหารที่กินได้", en: "Diet" },

    /* ---- Hub ---- */
    browseTitle: { th: "เลือกดูเอง", en: "Browse" },
    suggestedTitle: { th: "เมนูแนะนำ", en: "Suggested menu" },
    suggestedShuffle: { th: "แนะนำเมนูอื่น", en: "Suggest others" },
    suggestedUpdated: { th: "อัปเดตเมนูแนะนำแล้ว", en: "Suggested menu updated" },
    seeAllDishes: { th: "ดูเมนูทั้งหมด", en: "See all dishes" },
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
    avoidSection: { th: "ภูมิแพ้และของที่ไม่กิน", en: "Allergies and dislikes" },
    stallSection: { th: "ร้าน", en: "Stall" },
    displaySection: { th: "เรียงและจัดกลุ่ม", en: "Sort and group" },
    removeFilter: { th: "เอาตัวกรองออก", en: "Remove filter" },
    applyShort: { th: "ใช้ตัวกรอง", en: "Apply filters" },
    displayLegend: { th: "การแสดงผล", en: "Display" },
    budgetFilterLegend: { th: "งบ", en: "Budget" },
    budgetFilterHint: { th: "ราคาสูงสุดต่อจาน", en: "Highest price per dish" },
    variantsLabel: { th: "รวมราคาของเมนูพิเศษและท็อปปิ้งด้วย", en: "Include the price of specials and extras" },
    dietFilterLegend: { th: "อาหารที่กินได้", en: "Diet" },
    dietFilterHint: { th: "ดูจากเมนูหน้าร้าน ไม่ได้ถามร้าน", en: "From the menu board, not checked with the stall" },
    typeLegend: { th: "ประเภทเมนู", en: "Type of dish" },
    avoidLegend: { th: "ไม่เอา", en: "Leave out" },
    avoidHint: {
      th: "เดาจากสูตรทั่วไป ไม่ใช่เครื่องมือเช็กการแพ้",
      en: "Guessed from usual recipes, so not allergy-safe",
    },
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
      th: "กรองตามราคา อาหารที่กินได้ และประเภท",
      en: "Filter by price, diet and type.",
    },
    stallsTitle: { th: "ร้านค้าในโรงอาหาร", en: "Stalls in the canteen" },
    stallsIntro: {
      th: "เรียงตามเลขร้าน ซึ่งไล่ตามลำดับที่เดินผ่านในโรงอาหาร",
      en: "In stall number order, which follows the way you walk through the hall.",
    },
    noResultsTitle: { th: "ไม่เจอเมนูที่ตรงกับตัวกรอง", en: "No dishes match those filters" },
    relaxTitle: { th: "ลองแบบนี้ดู", en: "Try one of these" },
    relaxWithoutBudget: { th: "เอาเรื่องงบออก", en: "Remove the budget limit" },
    relaxWithoutOpen: { th: "ไม่ดูเวลาทำการ", en: "Ignore opening hours" },
    relaxWithoutVariants: { th: "นับเฉพาะราคาปกติ", en: "Count only the base price" },
    noResultsStalls: { th: "ไม่มีเมนูที่ตรงกับตัวกรอง", en: "No matching dishes" },
    otherDishes: { th: "เมนูอื่น ๆ", en: "Other dishes" },
    pageWord: { th: "หน้า", en: "Page" },

    /* ---- Dish card and page ---- */
    priceCheckedOn: { th: "ตรวจราคาเมื่อ", en: "Price checked on" },
    checkedShort: { th: "ตรวจเมื่อ", en: "Checked" },
    optionsTitle: { th: "ตัวเลือกและราคาเพิ่ม", en: "Options and extras" },
    addOnsTitle: { th: "ท็อปปิ้งและของเพิ่ม", en: "Add-ons" },
    extrasFrom: { th: "มีราคาเพิ่ม", en: "Extras available" },
    baseWord: { th: "ราคาปกติ", en: "Base price" },
    stallWord: { th: "ร้าน", en: "Stall" },
    priceTitle: { th: "ราคา", en: "Price" },
    whereTitle: { th: "ไปกินที่ไหน", en: "Where to find it" },
    aboutTitle: { th: "เกี่ยวกับเมนูนี้", en: "About this dish" },
    proteinLine: { th: "โปรตีน", en: "Protein" },
    containsLine: { th: "อาจมีส่วนผสมของ", en: "May contain" },
    typeLine: { th: "ประเภท", en: "Type" },
    styleLine: { th: "วิธีปรุง", en: "Cooking style" },
    temperatureLine: { th: "อุณหภูมิ", en: "Served" },
    dietTitle: { th: "อาหารที่กินได้", en: "Diet" },
    whatIsLink: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
    showOnMap: { th: "ดูตำแหน่งบนแผนที่", en: "Show on the map" },
    matchesTag: { th: "ตรงกับตัวกรอง", en: "Matches" },
    showOnlyMatching: { th: "ดูเฉพาะเมนูที่ตรงกับตัวกรอง", en: "Show only matching dishes" },
    comboWhere: { th: "ไปที่ไหนบ้าง", en: "Where to go" },
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
      th: "ยังไม่มีเมนูของแผงนี้",
      en: "No menu is listed for this stall yet.",
    },
    stallMatches: { th: "ตรงกับตัวกรอง", en: "match your filters" },
    viewStall: { th: "ดูเมนูร้านนี้", en: "See this stall's menu" },

    /* ---- Favourite toggle ---- */
    favouriteLabel: { th: "เมนูโปรด", en: "Favourite" },
    sayLabel: { th: "สั่งว่า", en: "To order, say" },
    sayOneOf: { th: "เลือกแล้วสั่งว่า", en: "Pick one and say" },
    orWord: { th: "หรือ", en: "or" },
    hearLabel: { th: "ฟังเสียงภาษาไทย", en: "Hear it in Thai" },
    menuNumberLabel: { th: "เมนูหมายเลข", en: "Number on the board:" },
    favouriteFailed: { th: "เก็บลงในอุปกรณ์นี้ไม่ได้", en: "Could not save to this device." },

    /* ---- Search and show more ---- */
    searchLabel: { th: "ค้นหาเมนู", en: "Search dishes" },
    searchHint: {
      th: "พิมพ์ชื่อเมนูภาษาไทยหรืออังกฤษ หรือคำอ่านที่ใช้สั่ง",
      en: "A dish name in Thai or English, or how you say it.",
    },
    searchButton: { th: "ค้นหา", en: "Search" },
    searchClear: { th: "ล้างคำค้น", en: "Clear search" },
    hubDishesHint: { th: "ทุกเมนู พร้อมราคาและตัวกรอง", en: "Every dish, with prices and filters." },
    hubStallsHint: { th: "ดูว่าร้านไหนขายอะไร เรียงตามเลขร้าน", en: "Who sells what, in stall number order." },
    hubMapHint: { th: "ผังโรงอาหาร หาร้านที่อยากไป", en: "The hall plan, to find your stall." },
  },
  { th: "โรงอาหาร: หน้าหลัก เมนู ร้าน และตัวกรอง", en: "Canteen: main pages, dishes, stalls and filters" },
);

export type EatKey = keyof typeof EAT;

/* ------------------------------------------------------------------ *
 * Strings with numbers in them. Each returns the finished string.
 * ------------------------------------------------------------------ */

const n = formatNumber;

/**
 * The wording of the strings that carry numbers or names. Each text has
 * {placeholders} that the functions below fill in. Where English has a
 * singular and a plural, the code picks between the One and Many keys.
 */
const PHRASE = editableStrings(
  "canteen-main-phrases",
  {
    baht: { th: "{amount} บาท", en: "{amount} baht" },
    fromBaht: { th: "เริ่ม {amount} บาท", en: "from {amount} baht" },
    atOtherStalls: { th: "ร้านอื่นที่มี{name}", en: "{name} at other stalls" },
    moreAtStall: { th: "และอีก {count} เมนูที่ร้านนี้", en: "and {count} more at this stall" },
    plusBaht: { th: "เพิ่ม {amount} บาท", en: "+{amount} baht" },
    underBaht: { th: "ไม่เกิน {amount} บาท", en: "up to {amount} baht" },
    resultCount: { th: "{dishes} จาก {stalls}", en: "{dishes} at {stalls}" },
    dishCountOne: { th: "{count} เมนู", en: "{count} dish" },
    dishCountMany: { th: "{count} เมนู", en: "{count} dishes" },
    filterCountOne: { th: "{count} ตัวกรอง", en: "{count} filter" },
    filterCountMany: { th: "{count} ตัวกรอง", en: "{count} filters" },
    showDishesOne: { th: "ดู {count} เมนู", en: "Show {count} dish" },
    showDishesMany: { th: "ดู {count} เมนู", en: "Show {count} dishes" },
    relaxRaiseOne: { th: "เพิ่มงบเป็น {budget} บาท จะได้ {count} เมนู", en: "Raise your budget to {budget} baht for {count} dish" },
    relaxRaiseMany: { th: "เพิ่มงบเป็น {budget} บาท จะได้ {count} เมนู", en: "Raise your budget to {budget} baht for {count} dishes" },
    relaxDropOne: { th: 'เอา "{label}" ออก จะได้ {count} เมนู', en: 'Drop "{label}" for {count} dish' },
    relaxDropMany: { th: 'เอา "{label}" ออก จะได้ {count} เมนู', en: 'Drop "{label}" for {count} dishes' },
    relaxGenericOne: { th: "{action} จะได้ {count} เมนู", en: "{action} for {count} dish" },
    relaxGenericMany: { th: "{action} จะได้ {count} เมนู", en: "{action} for {count} dishes" },
    openUntil: { th: "ตามเวลาทำการ เปิดถึง {time} น.", en: "Scheduled hours: open until {time}." },
    stallNumber: { th: "ร้านที่ {number}", en: "Stall {number}" },
    atStallsOne: { th: "{count} ร้าน", en: "{count} stall" },
    atStallsMany: { th: "{count} ร้าน", en: "{count} stalls" },
    stallMatchCountOne: { th: "{matching} จาก {total} เมนูตรงกับตัวกรอง", en: "{matching} of {total} dish matches your filters" },
    stallMatchCountMany: { th: "{matching} จาก {total} เมนูตรงกับตัวกรอง", en: "{matching} of {total} dishes match your filters" },
    priceRange: { th: "{min} ถึง {max} บาท", en: "{min} to {max} baht" },
    dishAtStall: { th: "{dish} ที่{stall}", en: "{dish} at {stall}" },
    stallsShownOne: { th: "{shown} จาก {total} ร้านมีเมนูที่ตรงกับตัวกรอง", en: "{shown} of {total} stalls has matching dishes" },
    stallsShownMany: { th: "{shown} จาก {total} ร้านมีเมนูที่ตรงกับตัวกรอง", en: "{shown} of {total} stalls have matching dishes" },
    showingRange: { th: "แสดงเมนูที่ {from} ถึง {to} จาก {total}", en: "Showing {from} to {to} of {total}" },
    showMoreMealsOne: { th: "แสดงเพิ่มอีก {count} มื้อ", en: "Show {count} more meal" },
    showMoreMealsMany: { th: "แสดงเพิ่มอีก {count} มื้อ", en: "Show {count} more meals" },
    showMoreOne: { th: "แสดงเพิ่มอีก {count} เมนู", en: "Show {count} more dish" },
    showMoreMany: { th: "แสดงเพิ่มอีก {count} เมนู", en: "Show {count} more dishes" },
    relaxSearchOne: { th: 'ล้างคำค้น "{query}" จะได้ {count} เมนู', en: 'Clear the search "{query}" for {count} dish' },
    relaxSearchMany: { th: 'ล้างคำค้น "{query}" จะได้ {count} เมนู', en: 'Clear the search "{query}" for {count} dishes' },
    noSearchResults: { th: 'ไม่เจอเมนูที่ตรงกับ "{query}"', en: 'No dishes match "{query}"' },
  },
  { th: "โรงอาหาร: ข้อความที่มีตัวเลขและชื่อแทรก", en: "Canteen: texts with numbers and names in them" },
);

export const eat = {
  /** "45 baht" / "45 บาท". */
  baht(locale: Locale, amount: number): string {
    return fillText(PHRASE.baht[locale], { amount: n(amount, locale) });
  },

  /** "from 25 baht". */
  fromBaht(locale: Locale, amount: number): string {
    return fillText(PHRASE.fromBaht[locale], { amount: n(amount, locale) });
  },

  /** "Fried rice at other stalls". */
  atOtherStalls(locale: Locale, name: string): string {
    return fillText(PHRASE.atOtherStalls[locale], { name });
  },

  /** "and 13 more at this stall". */
  moreAtStall(locale: Locale, count: number): string {
    return fillText(PHRASE.moreAtStall[locale], { count: n(count, locale) });
  },

  /** "+10 baht". */
  plusBaht(locale: Locale, amount: number): string {
    return fillText(PHRASE.plusBaht[locale], { amount: n(amount, locale) });
  },

  /** "up to 50 baht". */
  underBaht(locale: Locale, amount: number): string {
    return fillText(PHRASE.underBaht[locale], { amount: n(amount, locale) });
  },

  /** "23 dishes at 9 stalls". Announced politely when it changes. */
  resultCount(locale: Locale, dishes: number, stalls: number): string {
    return fillText(PHRASE.resultCount[locale], { dishes: eat.dishCount(locale, dishes), stalls: eat.atStalls(locale, stalls) });
  },

  /** "14 dishes". */
  dishCount(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.dishCountOne : PHRASE.dishCountMany)[locale], { count: n(count, locale) });
  },

  /** "3 filters". */
  filterCount(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.filterCountOne : PHRASE.filterCountMany)[locale], { count: n(count, locale) });
  },

  /** "Edit filters (3)". */
  editFiltersWithCount(locale: Locale, count: number): string {
    const base = EAT.editFilters[locale];
    return count > 0 ? `${base} (${n(count, locale)})` : base;
  },

  /** "Show 23 dishes". The submit button of the filter form. */
  showDishes(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.showDishesOne : PHRASE.showDishesMany)[locale], { count: n(count, locale) });
  },

  /** "Raise your budget to 60 baht for 8 dishes". */
  relaxRaise(locale: Locale, budget: number, count: number): string {
    return fillText((count === 1 ? PHRASE.relaxRaiseOne : PHRASE.relaxRaiseMany)[locale], { budget: n(budget, locale), count: n(count, locale) });
  },

  /** `Drop "cold" for 5 dishes`. */
  relaxDrop(locale: Locale, label: string, count: number): string {
    return fillText((count === 1 ? PHRASE.relaxDropOne : PHRASE.relaxDropMany)[locale], { label, count: n(count, locale) });
  },

  /** A relax suggestion with no named value, for example the budget. */
  relaxGeneric(locale: Locale, action: string, count: number): string {
    return fillText((count === 1 ? PHRASE.relaxGenericOne : PHRASE.relaxGenericMany)[locale], { action, count: n(count, locale) });
  },

  /** "Scheduled hours: open until 15:00". Never "open now": hours are a published schedule. */
  openUntil(locale: Locale, time: string): string {
    return fillText(PHRASE.openUntil[locale], { time });
  },

  /** "Stall 3". */
  stallNumber(locale: Locale, number: number): string {
    return fillText(PHRASE.stallNumber[locale], { number: n(number, locale) });
  },

  /** "Stall 3 · Fixture stall". A middle dot, never a dash. */
  stallFull(locale: Locale, number: number, name: string): string {
    return `${eat.stallNumber(locale, number)} · ${name}`;
  },

  /** "3 stalls". */
  atStalls(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.atStallsOne : PHRASE.atStallsMany)[locale], { count: n(count, locale) });
  },

  /** "5 of 12 dishes match your filters". */
  stallMatchCount(locale: Locale, matching: number, total: number): string {
    return fillText((total === 1 ? PHRASE.stallMatchCountOne : PHRASE.stallMatchCountMany)[locale], {
      matching: n(matching, locale),
      total: n(total, locale),
    });
  },

  /** "Price range 30 to 60 baht". */
  priceRange(locale: Locale, min: number, max: number): string {
    if (min === max) return eat.baht(locale, min);
    return fillText(PHRASE.priceRange[locale], { min: n(min, locale), max: n(max, locale) });
  },

  /** "Options for Fixture dish". */
  dishAtStall(locale: Locale, dish: string, stall: string): string {
    return fillText(PHRASE.dishAtStall[locale], { dish, stall });
  },

  /** "9 of 12 stalls", or "12 stalls" when no filter is on. */
  stallsShown(locale: Locale, shown: number, total: number, filtered: boolean): string {
    if (!filtered) return eat.atStalls(locale, total);
    return fillText((shown === 1 ? PHRASE.stallsShownOne : PHRASE.stallsShownMany)[locale], {
      shown: n(shown, locale),
      total: n(total, locale),
    });
  },

  /** "Page 2 of 5" is provided by ui Pagination; this is the "showing" line under the list. */
  showingRange(locale: Locale, from: number, to: number, total: number): string {
    return fillText(PHRASE.showingRange[locale], { from: n(from, locale), to: n(to, locale), total: n(total, locale) });
  },

  /** "Show 6 more meals". The link under the meal list. */
  showMoreMeals(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.showMoreMealsOne : PHRASE.showMoreMealsMany)[locale], { count: n(count, locale) });
  },

  /** "Show 20 more dishes". The link under the list. */
  showMore(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.showMoreOne : PHRASE.showMoreMany)[locale], { count: n(count, locale) });
  },

  /** `Clear the search "noodle" for 752 dishes`. */
  relaxSearch(locale: Locale, query: string, count: number): string {
    return fillText((count === 1 ? PHRASE.relaxSearchOne : PHRASE.relaxSearchMany)[locale], { query, count: n(count, locale) });
  },

  /** `No dishes match "noodle"`. The empty state when the search is what removed everything. */
  noSearchResults(locale: Locale, query: string): string {
    return fillText(PHRASE.noSearchResults[locale], { query });
  },

  /** The id of the list item at a 1 based position, the target of the "show more" link's fragment. */
  itemId(position: number): string {
    return `dish-${position}`;
  },
};
