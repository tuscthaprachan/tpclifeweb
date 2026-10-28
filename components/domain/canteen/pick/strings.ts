/**
 * Copy for "Decide for me" (/eat/pick), in Thai and English. The casual voice
 * is allowed in this section. Each language is written as itself. No em
 * dashes. Nothing here implies live data: prices are surveyed and dated.
 *
 * Plain module, no "use client": safe from server and client components.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

interface Pair {
  th: string;
  en: string;
}

const n = (value: number, locale: Locale) => formatNumber(value, locale);

export const PICK = {
  title: { th: "เลือกให้หน่อย", en: "Decide for me" },
  intro: {
    th: "บอกว่าชอบแบบไหน เราสุ่มมาให้หนึ่งอย่าง ไม่ถูกใจก็สุ่มใหม่ได้ไม่อั้น",
    en: "Tell us what you are into and we will pick one thing. Not feeling it? Spin again as often as you like.",
  },
  resultHeading: { th: "ที่สุ่มได้", en: "Your pick" },
  controlsHeading: { th: "เปลี่ยนวิธีสุ่ม", en: "Change how we pick" },

  /* ---- Controls ---- */
  modeLegend: { th: "อยากให้สุ่ม", en: "Pick me" },
  modeDish: { th: "เมนู", en: "A dish" },
  modeMeal: { th: "ชุดอาหารตามงบ", en: "A meal for my budget" },
  modeStall: { th: "ร้าน", en: "A stall" },
  biasLegend: { th: "สุ่มแบบไหน", en: "How to pick" },
  biasFair: { th: "แฟร์ ทุกร้านมีโอกาสเท่ากัน", en: "Fair, every stall equal" },
  biasNew: { th: "ของที่ยังไม่ค่อยได้กิน", en: "Something new to me" },
  biasCheap: { th: "เน้นราคาถูก", en: "Lean cheap" },
  biasUsual: { th: "เมนูโปรดของฉัน", en: "My usual" },
  biasHint: {
    th: "ใช้สิ่งที่คุณเคยเลือกไว้ในเครื่องนี้",
    en: "Uses what you've picked before on this phone.",
  },
  budgetLabel: { th: "งบรวมทั้งมื้อ (บาท)", en: "Budget for the whole meal (baht)" },
  spin: { th: "สุ่มเลย", en: "Spin" },

  /* ---- Actions ---- */
  actionsLabel: { th: "ทำอะไรต่อ", en: "What next" },
  eatThis: { th: "เอาอันนี้แหละ", en: "Go with this" },
  notThis: { th: "ไม่เอาอันนี้ สุ่มใหม่", en: "Not this one, spin again" },
  moreOptions: { th: "ตัวเลือกเพิ่มเติม", en: "More options" },
  spinAgain: { th: "สุ่มใหม่", en: "Spin again" },
  keepStall: { th: "ขอร้านเดิม เปลี่ยนเมนู", en: "Keep this stall, change the dish" },
  keepCanonical: { th: "ขอเมนูแบบเดิม เปลี่ยนร้าน", en: "Same dish, different stall" },
  lockLabel: { th: "ล็อกบางอย่างแล้วสุ่มใหม่", en: "Lock something and spin again" },
  seeStall: { th: "ไปดูหน้าร้าน", en: "See the stall" },
  share: { th: "แชร์ผลนี้", en: "Share this pick" },
  shareCopied: { th: "คัดลอกลิงก์แล้ว ใครเปิดก็เจออันเดียวกัน", en: "Link copied. Anyone who opens it sees the same pick." },
  shareManual: { th: "คัดลอกลิงก์นี้ไปแชร์", en: "Copy this link to share" },
  shareHint: { th: "ใครเปิดลิงก์นี้ก็เจอผลเดียวกัน", en: "Anyone who opens this link sees the same pick." },

  /* ---- Result ---- */
  relaxedTitle: { th: "ผ่อนเงื่อนไขให้นิดหน่อย", en: "We relaxed something" },
  relaxedRepeat: {
    th: "เมนูนี้เพิ่งกินไปไม่นาน แต่ไม่มีอย่างอื่นที่ตรงเงื่อนไข เลยยอมให้ซ้ำ",
    en: "You ate this recently, but nothing else matched, so we allowed a repeat.",
  },
  relaxedLock: {
    th: "ไม่มีเมนูอื่นที่เข้ากับสิ่งที่ล็อกไว้ เลยปล่อยการล็อก",
    en: "Nothing else fit what you kept, so we let the lock go.",
  },
  relaxedVeto: {
    th: "ที่เหลือเคยถูกกดผ่านไปหมดแล้ว เลยเอากลับมาให้อีกรอบ",
    en: "Everything left had already been passed over, so we brought one back.",
  },
  relaxedFilters: { th: "ตัวกรองของคุณไม่ได้ถูกแตะเลย", en: "Your filters were not touched." },
  stallPickTitle: { th: "ร้านที่สุ่มได้", en: "Your stall" },
  stallDishes: { th: "เมนูที่ตรงตัวกรองที่ร้านนี้", en: "Dishes here that match your filters" },
  mealPickTitle: { th: "ชุดอาหารที่สุ่มได้", en: "Your meal" },
  mealWalk: { th: "ร้านที่ต้องไป เรียงตามเลขร้าน", en: "Stalls to visit, in stall number order" },
  alsoWord: { th: "ร้าน", en: "at" },

  /* ---- Empty and notes ---- */
  emptyTitle: { th: "ไม่มีเมนูให้สุ่ม", en: "Nothing to pick from" },
  emptyFilters: {
    th: "ไม่มีเมนูไหนตรงกับตัวกรองตอนนี้ ลองผ่อนตัวกรองสักอย่าง",
    en: "No dish matches those filters right now. Try loosening one.",
  },
  emptyDislikes: {
    th: "เมนูที่ตรงทั้งหมดอยู่ในรายการ ไม่เอา ที่เก็บไว้ในเครื่องนี้ ลองผ่อนตัวกรองสักอย่าง",
    en: "Everything that matches is on the never-suggest list kept on this device. Try loosening a filter.",
  },
  emptyMealNeedsBudget: {
    th: "ชุดอาหารต้องมีงบ ใส่งบในช่องด้านล่างแล้วกดสุ่ม",
    en: "A meal needs a budget. Enter one below and spin.",
  },
  emptyMealGoToBudget: { th: "ไปที่ช่องใส่งบ", en: "Go to the budget box" },
  emptyMeal: {
    th: "ไม่มีชุดอาหารที่ลงตัวกับงบและตัวกรองนี้",
    en: "No meal fits that budget and those filters.",
  },
  startOver: { th: "ล้างตัวกรองแล้วสุ่มใหม่", en: "Clear the filters and spin" },
  browseDishes: { th: "ดูเมนูทั้งหมด", en: "Browse all dishes" },
  noteServer: {
    th: "ถ้าไม่เปิด JavaScript ผลนี้จะไม่เลี่ยงเมนูที่เพิ่งกิน",
    en: "Turn on JavaScript and we will skip what you had recently.",
  },
  noteServerBias: {
    th: "ของใหม่และเมนูโปรดต้องเปิด JavaScript ผลนี้จึงสุ่มแบบแฟร์แทน",
    en: "Something new and My usual need JavaScript, so this pick is a fair one.",
  },
  noteApplied: { th: "เลี่ยงเมนูที่เพิ่งกินแล้ว", en: "Skipping what you had recently." },
  noteAppliedLink: { th: "ดูของฉัน", en: "See your stuff" },
} as const satisfies Record<string, Pair>;

export const pickText = {
  /** "Pick: Fixture dish A at Stall 3 · Fixture stall", read once when the reel settles. */
  announce(locale: Locale, text: string): string {
    return locale === "th" ? `สุ่มได้ ${text}` : `Picked ${text}`;
  },
  announceMeal(locale: Locale, text: string): string {
    return locale === "th" ? `สุ่มชุดอาหารได้ ${text}` : `Picked a meal: ${text}`;
  },
  /** "Keep noodles, change the stall". */
  keepType(locale: Locale, type: string): string {
    return locale === "th" ? `ขอ${type}เหมือนเดิม เปลี่ยนร้าน` : `Keep ${type.toLowerCase()}, change the stall`;
  },
  mealTotal(locale: Locale, total: number, change: number, budget: number): string {
    if (change === 0) {
      return locale === "th" ? `รวม ${n(total, locale)} บาท พอดีงบ` : `${n(total, locale)} baht, exactly on budget`;
    }
    return locale === "th"
      ? `รวม ${n(total, locale)} บาท จากงบ ${n(budget, locale)} บาท เหลือ ${n(change, locale)} บาท`
      : `${n(total, locale)} baht of your ${n(budget, locale)} baht, ${n(change, locale)} baht left`;
  },
  reelLabel(locale: Locale): string {
    return locale === "th" ? "กำลังสุ่ม" : "Spinning";
  },
} as const;
