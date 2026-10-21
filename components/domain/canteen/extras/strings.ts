/**
 * Strings for "what is this dish", in Thai and English. No em dashes. Prices are surveyed figures
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
    th: "เมนูไทยที่เจอบ่อยในโรงอาหาร อธิบายสั้น ๆ สำหรับคนที่ไม่เคยกิน",
    en: "The Thai dishes you will meet at the canteen, explained for someone who has never had them.",
  },
  whatIsListLabel: { th: "เมนูเรียงตามตัวอักษร", en: "Dishes from A to Z" },
  whatIsNoData: { th: "ยังไม่มีเมนูให้อธิบาย", en: "No dishes explained yet" },
  whatIsNoDataBody: {
    th: "คำอธิบายเมนูจะขึ้นที่นี่หลังสำรวจโรงอาหารเสร็จ",
    en: "Explanations will show up here once the canteen survey is done.",
  },
  noExplainer: { th: "ยังไม่มีคำอธิบายเมนูนี้", en: "No explanation for this dish yet." },
  noStallNow: { th: "ยังไม่พบร้านที่ขายเมนูนี้ในการสำรวจ", en: "No stall sells this in our survey yet." },
  backToList: { th: "เมนูทั้งหมด", en: "All dishes" },

  /* ---- What is this dish: page ---- */
  stallsTitle: { th: "ร้านไหนทำ ราคาเท่าไร", en: "Who makes it, and for how much" },
  stallsNote: {
    th: "ราคามาจากการสำรวจ ไม่ใช่ข้อมูลสด ทุกราคาบอกวันที่ตรวจไว้",
    en: "Prices come from our survey, not a live feed. Every price shows the day it was checked.",
  },
  aboutTitle: { th: "คืออะไร", en: "What it is" },
  seeDishes: { th: "ดูเมนูของร้านทั้งหมด", en: "See every dish" },
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
};
