/**
 * Strings for "what is this dish", the show-to-the-stall card and the price
 * tracker, in Thai and English. No em dashes. Prices are surveyed figures
 * with dates, never live or projected.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

import type { Bilingual } from "../strings";

const n = formatNumber;

export const EXTRAS = {
  /* ---- What is this dish: index ---- */
  whatIsTitle: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
  whatIsIntro: {
    th: "เมนูไทยที่เจอบ่อยในโรงอาหาร อธิบายสั้น ๆ พร้อมประโยคสั่งอาหารที่ยื่นให้ร้านดูได้",
    en: "The Thai dishes you will meet at the canteen, explained for someone who has never had them, with phrases to order in Thai.",
  },
  whatIsListLabel: { th: "เมนูเรียงตามตัวอักษร", en: "Dishes from A to Z" },
  whatIsNoData: { th: "ยังไม่มีเมนูให้อธิบาย", en: "No dishes explained yet" },
  whatIsNoDataBody: {
    th: "คำอธิบายเมนูจะขึ้นที่นี่หลังสำรวจโรงอาหารเสร็จ",
    en: "Explanations will show up here once the canteen survey is done.",
  },
  noExplainer: { th: "ยังไม่มีคำอธิบายเมนูนี้", en: "No explanation for this dish yet." },
  noStallNow: { th: "ยังไม่พบร้านที่ขายเมนูนี้ในการสำรวจ", en: "No stall sells this in our survey yet." },
  readMore: { th: "อ่านต่อและดูวิธีสั่ง", en: "Read more and how to order" },
  backToList: { th: "เมนูทั้งหมด", en: "All dishes" },

  /* ---- What is this dish: page ---- */
  stallsTitle: { th: "ร้านไหนทำ ราคาเท่าไร", en: "Who makes it, and for how much" },
  stallsNote: {
    th: "ราคามาจากการสำรวจ ไม่ใช่ข้อมูลสด ทุกราคาบอกวันที่ตรวจไว้",
    en: "Prices come from our survey, not a live feed. Every price shows the day it was checked.",
  },
  aboutTitle: { th: "คืออะไร", en: "What it is" },
  seeDishes: { th: "ดูเมนูของร้านทั้งหมด", en: "See every dish" },

  /* ---- How to order ---- */
  orderTitle: { th: "สั่งอย่างไร", en: "How to order" },
  orderIntro: {
    th: "ชี้หรือยื่นประโยคให้คนขายดูได้เลย ไม่ต้องพูดก็ได้",
    en: "Point at a phrase or show it to the cook. You do not have to say it out loud.",
  },
  inThai: { th: "ภาษาไทย", en: "In Thai" },
  sayItLike: { th: "อ่านออกเสียงว่า", en: "Say it like" },
  itMeans: { th: "แปลว่า", en: "It means" },
  showToStall: { th: "ให้ร้านดู", en: "Show to the stall" },
  showDialogTitle: { th: "ให้ร้านดู", en: "Show to the stall" },
  showHint: {
    th: "ยื่นหน้าจอให้คนขายอ่าน",
    en: "Hold the screen up so the cook can read it.",
  },
  closeShow: { th: "กลับไปหน้าเมนู", en: "Back to the dish" },
  noPhrases: { th: "ยังไม่มีประโยคสั่งอาหารสำหรับเมนูนี้", en: "No order phrases for this dish yet." },

  /* ---- Price history ---- */
  historyTitle: { th: "ราคาที่สำรวจได้", en: "Surveyed prices" },
  historyDishTitle: { th: "ราคาตามการสำรวจแต่ละครั้ง", en: "Price at each survey" },
  historyNote: {
    th: "แสดงเฉพาะราคาที่สำรวจจริงพร้อมวันที่ ไม่มีการคาดการณ์ ถ้าไม่ได้สำรวจในช่วงไหน ช่วงนั้นจะไม่มีตัวเลข",
    en: "Only prices we actually surveyed, with their dates. Nothing is projected, and a gap means we did not survey then.",
  },
  showAsTable: { th: "ดูเป็นตาราง", en: "Show as a table" },
  colWhen: { th: "ช่วงที่สำรวจ", en: "Surveyed" },
  colDate: { th: "วันที่ตรวจ", en: "Checked on" },
  colPrice: { th: "ราคา (บาท)", en: "Price (baht)" },
  colMedian: { th: "ราคากลาง (บาท)", en: "Median (baht)" },
  colPlates: { th: "จำนวนจาน", en: "Plates" },
  colStall: { th: "ร้าน", en: "Stall" },
  semesterNote: {
    th: "ภาคเรียนที่ 1 คือสิงหาคมถึงธันวาคม ภาคเรียนที่ 2 คือมกราคมถึงพฤษภาคม ภาคฤดูร้อนคือมิถุนายนถึงกรกฎาคม ปีเป็นพุทธศักราช",
    en: "Semester 1 is August to December, semester 2 is January to May and summer is June to July. Years are shown in the Thai Buddhist era in Thai and as academic years in English.",
  },
  trackerTitle: { th: "ข้าวหนึ่งจานราคาเท่าไร", en: "A plate of rice over time" },
  trackerChartTitle: { th: "ราคากลางของข้าวหนึ่งจาน แยกตามภาคเรียน", en: "Median price of a plate of rice, by semester" },
} as const satisfies Record<string, Bilingual>;

export const extras = {
  /** "45 baht" / "45 บาท". */
  baht(locale: Locale, amount: number): string {
    return locale === "th" ? `${n(amount, locale)} บาท` : `${n(amount, locale)} baht`;
  },

  /** "Across the canteen: 40 to 50 baht". Same price at every stall gives one figure. */
  acrossCanteen(locale: Locale, min: number, max: number, stalls: number): string {
    const range =
      min === max
        ? extras.baht(locale, min)
        : locale === "th"
          ? `${n(min, locale)} ถึง ${n(max, locale)} บาท`
          : `${n(min, locale)} to ${n(max, locale)} baht`;
    if (locale === "th") return `${range} จาก ${n(stalls, locale)} ร้าน`;
    return `${range} at ${n(stalls, locale)} ${stalls === 1 ? "stall" : "stalls"}`;
  },

  /** Aria label for one phrase's show button. */
  showPhraseLabel(locale: Locale, phrase: string): string {
    return locale === "th" ? `ให้ร้านดู: ${phrase}` : `Show to the stall: ${phrase}`;
  },

  /** Short note under a chart that does not plot every point. */
  plottedLatest(locale: Locale, plotted: number, total: number): string {
    return locale === "th"
      ? `กราฟแสดง ${n(plotted, locale)} ครั้งล่าสุดจากทั้งหมด ${n(total, locale)} ครั้ง ตารางมีครบทุกครั้ง`
      : `The chart shows the latest ${n(plotted, locale)} of ${n(total, locale)} surveys. The table has every one.`;
  },

  /** Text alternative of a chart: "Price at each survey: 40 baht in Aug 26, 45 baht in Jan 27". */
  chartSummary(locale: Locale, title: string, parts: string[]): string {
    return `${title}: ${parts.join(locale === "th" ? ", " : ", ")}`;
  },

  /** "40 baht in 1/2568". */
  bahtIn(locale: Locale, amount: number, when: string): string {
    return locale === "th" ? `${n(amount, locale)} บาท ใน ${when}` : `${n(amount, locale)} baht in ${when}`;
  },

  /** The hub line: "A plate of rice, median of the plates we surveyed: 40 baht in 1/2568, 45 baht in 2/2568." */
  riceTrend(locale: Locale, firstAmount: number, firstWhen: string, latestAmount: number, latestWhen: string): string {
    return locale === "th"
      ? `ข้าวหนึ่งจาน ราคากลางของจานที่สำรวจ: ${n(firstAmount, locale)} บาท ในภาค ${firstWhen} และ ${n(latestAmount, locale)} บาท ในภาค ${latestWhen}`
      : `A plate of rice, median of the plates we surveyed: ${n(firstAmount, locale)} baht in ${firstWhen}, ${n(latestAmount, locale)} baht in ${latestWhen}.`;
  },

  /** "12 plates" / "12 จาน". */
  plates(locale: Locale, count: number): string {
    return locale === "th" ? `${n(count, locale)} จาน` : `${n(count, locale)} ${count === 1 ? "plate" : "plates"}`;
  },

  /** Chart heading for one dish: "Fixture dish A at stall 3". */
  dishAtStall(locale: Locale, dish: string, stall: string): string {
    return locale === "th" ? `${dish} ที่${stall}` : `${dish} at ${stall}`;
  },
};
