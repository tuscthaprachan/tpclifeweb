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
    th: "ตัวเลือก ของใหม่ และ เมนูโปรด ใช้ประวัติในเครื่องนี้ ต้องเปิด JavaScript",
    en: "Something new and My usual use the history kept on this device, so they need JavaScript.",
  },
  budgetLabel: { th: "งบรวมทั้งมื้อ (บาท)", en: "Budget for the whole meal (baht)" },
  spin: { th: "สุ่มเลย", en: "Spin" },

  /* ---- Actions ---- */
  actionsLabel: { th: "ทำอะไรต่อ", en: "What next" },
  eatThis: { th: "เอาอันนี้แหละ", en: "Go with this" },
  notThis: { th: "ไม่เอาอันนี้", en: "Not feeling it" },
  spinAgain: { th: "สุ่มใหม่", en: "Spin again" },
  keepStall: { th: "ขอร้านเดิม เปลี่ยนเมนู", en: "Keep this stall, change the dish" },
  keepCanonical: { th: "ขอเมนูแบบเดิม เปลี่ยนร้าน", en: "Same dish, different stall" },
  lockLabel: { th: "ล็อกบางอย่างแล้วสุ่มใหม่", en: "Lock something and spin again" },
  eatenDone: { th: "จดไว้ในเครื่องนี้แล้ว กินให้อร่อย", en: "Noted on this device. Enjoy." },
  eatenFailed: {
    th: "เครื่องนี้บันทึกไม่ได้ แต่ไปที่ร้านได้เลย",
    en: "This device would not save that, but you can still head to the stall.",
  },
  seeStall: { th: "ไปดูหน้าร้าน", en: "See the stall" },
  seeOnMap: { th: "ดูทางเดินบนแผนที่", en: "See the walk on the map" },
  share: { th: "แชร์ผลนี้", en: "Share this pick" },
  shareCopied: { th: "คัดลอกลิงก์แล้ว ใครเปิดก็เจออันเดียวกัน", en: "Link copied. Anyone who opens it sees the same pick." },
  shareManual: { th: "คัดลอกลิงก์นี้ไปแชร์", en: "Copy this link to share" },
  shareHint: { th: "ใครเปิดลิงก์นี้ก็เจอผลเดียวกัน", en: "Anyone who opens this link sees the same pick." },

  /* ---- Result ---- */
  whereTitle: { th: "ไปหาได้ที่ไหน", en: "Where to find it" },
  whyTitle: { th: "ทำไมถึงตรง", en: "Why it matched" },
  whyNoFilters: { th: "ไม่ได้ตั้งตัวกรอง เมนูไหนก็เข้าเงื่อนไข", en: "No filters are set, so anything counted." },
  whyCheap: { th: "เมนูราคาถูกมีโอกาสถูกสุ่มมากกว่า", en: "Cheaper dishes were more likely to come up." },
  whyKeepStall: { th: "ล็อกร้านเดิมไว้", en: "Kept the same stall." },
  whyKeepCanonical: { th: "ล็อกเมนูแบบเดิมไว้", en: "Kept the same dish." },
  orderTitle: { th: "สั่งยังไง", en: "How to order" },
  orderShow: { th: "ยื่นให้แม่ค้าดูได้เลย", en: "You can show the Thai to the stall." },
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
    th: "ชุดอาหารต้องมีงบ ใส่งบในช่องด้านบนแล้วกดสุ่ม",
    en: "A meal needs a budget. Enter one above and spin.",
  },
  emptyMeal: {
    th: "ไม่มีชุดอาหารที่ลงตัวกับงบและตัวกรองนี้",
    en: "No meal fits that budget and those filters.",
  },
  startOver: { th: "ล้างตัวกรองแล้วสุ่มใหม่", en: "Clear the filters and spin" },
  browseDishes: { th: "ดูเมนูทั้งหมด", en: "Browse all dishes" },
  noteServer: {
    th: "ประวัติ เมนูโปรด และรายการ ไม่เอา เก็บไว้ในเครื่องนี้เท่านั้น เมื่อเปิด JavaScript เราใช้มันตอนสุ่มและเลี่ยงเมนูที่เพิ่งกิน ถ้าปิดไว้ ผลนี้ไม่ได้ใช้ข้อมูลเหล่านั้น",
    en: "Your history, favourites and never-suggest list stay on this device. With JavaScript on, we use them when picking and skip what you ate recently. Without it, this pick does not use them.",
  },
  noteServerBias: {
    th: "แบบ ของใหม่ และ เมนูโปรด ต้องใช้ประวัติในเครื่องนี้ ซึ่งเซิร์ฟเวอร์มองไม่เห็น เมื่อไม่เปิด JavaScript ผลนี้จึงสุ่มแบบแฟร์แทน",
    en: "Something new and My usual need the history kept on this device, which the server cannot see. Without JavaScript this pick is a fair one instead.",
  },
  noteApplied: {
    th: "ผลนี้ใช้ข้อมูลในเครื่องนี้แล้ว (ประวัติ เมนูโปรด หรือรายการ ไม่เอา) ไม่มีอะไรถูกส่งออกไป",
    en: "This pick used what is kept on this device (history, favourites or the never-suggest list). Nothing is sent anywhere.",
  },
  noteNothingToApply: {
    th: "ยังไม่มีประวัติในเครื่องนี้ ผลนี้จึงสุ่มจากตัวกรองอย่างเดียว กด เอาอันนี้แหละ เพื่อจดไว้ให้สุ่มรอบหน้าเลี่ยงซ้ำ",
    en: "Nothing is kept on this device yet, so this pick came from your filters alone. Tap Go with this and next time we will skip repeats.",
  },
  surveyNote: {
    th: "ราคาและตำแหน่งมาจากการสำรวจ ไม่ใช่ข้อมูลสด",
    en: "Prices and positions come from our survey, not a live feed.",
  },
} as const satisfies Record<string, Pair>;

export const pickText = {
  /** "Pick: Fixture dish A at Stall 3 · Fixture stall", read once when the reel settles. */
  announce(locale: Locale, text: string): string {
    return locale === "th" ? `สุ่มได้ ${text}` : `Picked ${text}`;
  },
  announceMeal(locale: Locale, text: string): string {
    return locale === "th" ? `สุ่มชุดอาหารได้ ${text}` : `Picked a meal: ${text}`;
  },
  /** "Matches under 50 baht, no pork". */
  whyFilters(locale: Locale, list: string): string {
    return locale === "th" ? `ตรงกับ ${list}` : `Matches ${list}.`;
  },
  whyPool(locale: Locale, count: number): string {
    return locale === "th" ? `สุ่มจาก ${n(count, locale)} เมนู` : `Drawn from ${n(count, locale)} ${count === 1 ? "dish" : "dishes"}.`;
  },
  /** "Keep noodles, change the stall". */
  keepType(locale: Locale, type: string): string {
    return locale === "th" ? `ขอ${type}เหมือนเดิม เปลี่ยนร้าน` : `Keep ${type.toLowerCase()}, change the stall`;
  },
  whyKeepType(locale: Locale, type: string): string {
    return locale === "th" ? `ล็อกประเภทเดิมไว้ (${type})` : `Kept the same type (${type.toLowerCase()}).`;
  },
  mealTotal(locale: Locale, total: number, change: number, budget: number): string {
    return locale === "th"
      ? `รวม ${n(total, locale)} บาท จากงบ ${n(budget, locale)} บาท เหลือ ${n(change, locale)} บาท`
      : `${n(total, locale)} baht of your ${n(budget, locale)} baht, ${n(change, locale)} baht left`;
  },
  mealWhy(locale: Locale, budget: number): string {
    return locale === "th"
      ? `เลือกมาจากชุดที่ใช้งบ ${n(budget, locale)} บาทได้คุ้มที่สุด`
      : `Drawn from the combinations that use ${n(budget, locale)} baht best.`;
  },
  reelLabel(locale: Locale): string {
    return locale === "th" ? "กำลังสุ่ม" : "Spinning";
  },
} as const;
