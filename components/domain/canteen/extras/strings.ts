/**
 * Strings for "what is this dish", in Thai and English. No em dashes. Prices are surveyed figures
 * with dates, never live or projected.
 */

import type { Locale } from "@/lib/i18n/config";
import { editableStrings, fillText } from "@/lib/i18n/editable";
import { formatNumber } from "@/lib/i18n/format";

const n = formatNumber;

export const EXTRAS = editableStrings(
  "canteen-extras",
  {
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
    aboutTitle: { th: "คืออะไร", en: "What it is" },
    seeDishes: { th: "ดูเมนูของร้านทั้งหมด", en: "See every dish" },
  },
  { th: "โรงอาหาร: เมนูนี้คืออะไร", en: "Canteen: What is this dish" },
);

const PHRASE = editableStrings(
  "canteen-extras-phrases",
  {
    baht: { th: "{amount} บาท", en: "{amount} baht" },
    range: { th: "{min} ถึง {max} บาท", en: "{min} to {max} baht" },
    acrossCanteen: { th: "{range} จาก {stalls} ร้าน", en: "{range} at {stalls} stalls" },
    acrossCanteenOne: { th: "{range} จาก {stalls} ร้าน", en: "{range} at {stalls} stall" },
  },
  { th: "โรงอาหาร: เมนูนี้คืออะไร ข้อความที่มีตัวเลขแทรก", en: "Canteen: What is this dish, texts with numbers in them" },
);

export const extras = {
  /** "45 baht" / "45 บาท". */
  baht(locale: Locale, amount: number): string {
    return fillText(PHRASE.baht[locale], { amount: n(amount, locale) });
  },

  /** "Across the canteen: 40 to 50 baht". Same price at every stall gives one figure. */
  acrossCanteen(locale: Locale, min: number, max: number, stalls: number): string {
    const range = min === max ? extras.baht(locale, min) : fillText(PHRASE.range[locale], { min: n(min, locale), max: n(max, locale) });
    return fillText((stalls === 1 ? PHRASE.acrossCanteenOne : PHRASE.acrossCanteen)[locale], { range, stalls: n(stalls, locale) });
  },
};
