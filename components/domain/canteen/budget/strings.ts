/**
 * Copy for the budget tools (/eat/plan) and personal data
 * (/eat/mine). Thai and English, written separately. No em dashes.
 */

import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { Bilingual } from "../strings";

const n = formatNumber;

export const BUDGET = {
  /* ---- Meal ---- */
  mealTitle: { th: "มื้อนี้งบเท่านี้", en: "Meal for my budget" },
  mealIntro: {
    th: "บอกว่ามีกี่บาท เราจัดจานหลักบวกเครื่องดื่มหรือของหวานให้พอดีงบ",
    en: "Tell us how many baht you have. We put together a main, plus a drink or a dessert if it fits.",
  },
  mealFormTitle: { th: "งบของคุณ", en: "Your budget" },
  budgetLegend: { th: "มีกี่บาท", en: "How many baht do you have?" },
  budgetOther: { th: "หรือพิมพ์จำนวนเงิน (บาท) ถ้ากรอกช่องนี้จะใช้ช่องนี้แทนปุ่ม", en: "Or type an amount (baht). If this box is filled, it is used instead of the buttons." },
  sameStall: { th: "ร้านเดียวพอ", en: "Same stall only" },
  sameStallHint: { th: "เครื่องดื่มและของหวานต้องมาจากร้านเดียวกับจานหลัก จะได้ไม่ต้องต่อคิวสองที่", en: "Drink and dessert come from the same stall as the main, so you queue once." },
  mealSubmit: { th: "หามื้อให้พอดีงบ", en: "Find meals" },
  mealPromptTitle: { th: "ใส่งบก่อน แล้วเราจะจัดให้", en: "Pick a budget and we will put meals together" },
  mealPromptBody: { th: "เลือกจำนวนเงินด้านบน หรือพิมพ์เองก็ได้", en: "Choose an amount above, or type your own." },
  randomCombo: { th: "สุ่มมื้อให้เลย", en: "Random combo" },
  comboListTitle: { th: "มื้อที่ได้", en: "Meals that fit" },
  comboTotal: { th: "รวม", en: "Total" },
  comboItems: { th: "เมนูในมื้อนี้", en: "In this meal" },
  comboWalk: { th: "เดินตามลำดับนี้", en: "Walk in this order" },
  mealZeroTitle: { th: "ไม่มีมื้อที่พอดีงบนี้", en: "No meal fits that budget" },
  mealZeroBody: {
    th: "ลองเพิ่มงบเล็กน้อย หรือผ่อนตัวกรองบางอย่าง",
    en: "Try a little more money, or loosen a filter.",
  },
  allowAnyStall: { th: "ไม่จำกัดร้านเดียว", en: "Allow different stalls" },
  mealLimitNote: { th: "แสดงมื้อที่ใช้งบได้คุ้มที่สุดก่อน", en: "Best use of your money comes first." },
  mealMapLabel: { th: "แผนที่ร้านที่ต้องแวะ", en: "Map of the stalls to visit" },

  /* ---- Week ---- */
  weekTitle: { th: "จัดมื้อกลางวันทั้งสัปดาห์", en: "Plan my week" },
  weekIntro: {
    th: "บอกงบทั้งสัปดาห์และวันที่มามหาวิทยาลัย เราจัดมื้อกลางวันให้ทุกวัน ไม่ซ้ำร้าน ไม่ซ้ำเมนูแบบเดียวกัน",
    en: "Give us a weekly budget and the days you are on campus. We pick one lunch per day, no stall twice and no dish twice.",
  },
  weekFormTitle: { th: "แผนของคุณ", en: "Your plan" },
  weekBudgetLabel: { th: "งบทั้งสัปดาห์ (บาท)", en: "Weekly budget (baht)" },
  weekBudgetHint: { th: "เช่น 400 สำหรับห้าวัน", en: "For example 400 for five days." },
  daysLegend: { th: "วันที่อยู่ที่มหาวิทยาลัย", en: "Days on campus" },
  weekSubmit: { th: "จัดแผน", en: "Make my plan" },
  newPlan: { th: "สุ่มแผนใหม่ทั้งสัปดาห์", en: "New plan for the week" },
  newPlanHint: { th: "วันที่ล็อกไว้จะไม่เปลี่ยน", en: "Locked days stay." },
  weekPromptTitle: { th: "ใส่งบและวันที่ไปมหาวิทยาลัยก่อน", en: "Add a budget and your days first" },
  weekPromptBody: { th: "เมื่อกดจัดแผน หน้านี้จะได้ลิงก์ที่แชร์ได้และเปิดซ้ำแล้วได้แผนเดิม", en: "Once you make a plan, the page address is a link you can share. Opening it again gives the same plan." },
  planTableCaption: { th: "มื้อกลางวันรายวัน", en: "Lunch for each day" },
  colDay: { th: "วัน", en: "Day" },
  colDish: { th: "เมนู", en: "Dish" },
  colStall: { th: "ร้าน", en: "Stall" },
  colPrice: { th: "ราคา", en: "Price" },
  colActions: { th: "ปรับ", en: "Change" },
  lock: { th: "ล็อก", en: "Lock" },
  unlock: { th: "ปลดล็อก", en: "Unlock" },
  reroll: { th: "สุ่มใหม่", en: "Reroll" },
  lockedTag: { th: "ล็อกอยู่", en: "Locked" },
  allowance: { th: "งบต่อวัน", en: "Daily allowance" },
  weekTotal: { th: "รวมทั้งสัปดาห์", en: "Week total" },
  weekChange: { th: "เหลือจากงบ", en: "Left from budget" },
  weekBudgetWord: { th: "งบ", en: "Budget" },
  shareNote: {
    th: "แชร์แผนนี้ได้โดยส่งที่อยู่หน้านี้ เปิดซ้ำแล้วได้แผนเดิม",
    en: "To share this plan, send the page address. Opening it again gives the same plan.",
  },
  printHeading: { th: "แผนมื้อกลางวันของฉัน", en: "My lunch plan" },
  printButton: { th: "พิมพ์แผนนี้", en: "Print this plan" },
  saveWeek: { th: "เก็บสัปดาห์นี้ไว้ในเครื่องของฉัน", en: "Save this week to my device" },
  saveWeekDone: { th: "เก็บไว้ในเครื่องนี้แล้ว ดูได้ที่หน้า ของฉัน", en: "Saved on this device. You can see it on Your stuff." },
  saveWeekFailed: { th: "เก็บไม่สำเร็จ เบราว์เซอร์นี้ไม่ยอมให้เก็บข้อมูลในเครื่อง", en: "Could not save. This browser is not letting the page keep data on your device." },
  saveWeekNote: { th: "เก็บในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน", en: "Kept on this device only. Nothing is sent anywhere." },
  replacesWeek: { th: "จะแทนที่สัปดาห์ที่เก็บไว้ก่อนหน้า", en: "This replaces the week you saved before." },
  openMine: { th: "ดูของฉัน", en: "Open Your stuff" },
  failNoDays: {
    th: "ยังไม่ได้เลือกวัน ติ๊กอย่างน้อยหนึ่งวันที่คุณอยู่ที่มหาวิทยาลัย",
    en: "No days chosen. Tick at least one day you are on campus.",
  },
  failBadDays: { th: "วันที่เลือกไม่ถูกต้อง เลือกวันใหม่จากแบบฟอร์ม", en: "Those days are not valid. Choose the days again in the form." },
  failUnknownLock: {
    th: "เมนูที่ล็อกไว้ไม่อยู่ในรายการแล้ว อาจถูกเอาออกจากเมนู ปลดล็อกทุกวันแล้วจัดใหม่",
    en: "A day you locked is no longer on the menu. Unlock every day and plan again.",
  },
  failLockConflict: {
    th: "วันที่ล็อกไว้ชนกัน เช่น ร้านเดียวกันหรือเมนูแบบเดียวกันสองวัน ปลดล็อกบางวัน",
    en: "Two locked days clash: the same stall, or the same dish twice. Unlock one of them.",
  },
  failNotEnoughStalls: {
    th: "ตัวกรองตอนนี้เหลือร้านไม่พอสำหรับทุกวัน เพราะเราไม่จัดร้านเดียวกันซ้ำ ลดจำนวนวัน หรือผ่อนตัวกรอง",
    en: "With these filters there are fewer stalls than days, and we never repeat a stall. Choose fewer days or loosen a filter.",
  },
  failBudgetTooLow: {
    th: "งบนี้ไม่พอสำหรับทุกวัน แม้เลือกร้านที่ถูกที่สุด",
    en: "This budget is not enough for every day, even with the cheapest stalls.",
  },
  failNoPlan: {
    th: "หาแผนที่ลงตัวไม่ได้ในเวลาที่กำหนด ลองเพิ่มงบ ลดจำนวนวัน หรือผ่อนตัวกรอง",
    en: "We could not find a plan that fits in the time we allow. Try more budget, fewer days or looser filters.",
  },
  failTitle: { th: "จัดแผนไม่ได้", en: "We could not make a plan" },
  suggestTitle: { th: "ลองแบบนี้", en: "Try this" },
  suggestFewerDays: { th: "ลดเหลือ", en: "Plan" },
  unlockAll: { th: "ปลดล็อกทุกวัน", en: "Unlock every day" },

  /* ---- Spend ---- */
  spendTitle: { th: "ที่บันทึกไว้สัปดาห์นี้", en: "Logged this week" },
  spendOnlyNote: {
    th: "นับเฉพาะมื้อที่คุณกด \"กินมื้อนี้\" ไว้ ไม่ใช่ทุกอย่างที่คุณกินหรือจ่ายจริง สัปดาห์เริ่มวันจันทร์ ตามเวลาประเทศไทย",
    en: "This only counts what you tapped \"I'll eat this\" for. It is not everything you ate or paid. The week starts on Monday, Thailand time.",
  },
  spendNoTarget: { th: "ยังไม่ได้เก็บแผนสัปดาห์ไว้ จึงแสดงยอดรวมอย่างเดียว", en: "No saved week, so this is just the total." },

  /* ---- Mine ---- */
  mineTitle: { th: "ของฉัน", en: "Your stuff" },
  mineIntro: {
    th: "เมนูโปรด ประวัติ ตัวกรองที่ตั้งไว้ และแผนสัปดาห์ ทุกอย่างเก็บในเครื่องนี้เท่านั้น ไม่มีบัญชี ไม่ส่งไปที่ไหน",
    en: "Favourites, history, saved filters and your week. All of it lives on this device only. No account, and nothing is sent anywhere.",
  },
  mineNoJsTitle: { th: "หน้านี้ต้องใช้ JavaScript", en: "This page needs JavaScript" },
  mineNoJsBody: {
    th: "ข้อมูลของคุณอยู่ในเครื่องนี้เท่านั้น เว็บไซต์เห็นไม่ได้ จึงแสดงได้ก็ต่อเมื่อเบราว์เซอร์เปิด JavaScript ส่วนหน้าอื่นของ \"กินอะไรดี\" ใช้ได้ตามปกติ",
    en: "Your data only exists on your device, and the server cannot see it. So this page can only show it when your browser runs JavaScript. The rest of What to eat works as usual.",
  },
  mineLoading: { th: "กำลังอ่านจากเครื่องของคุณ", en: "Reading from your device" },
  mineNoStorageTitle: { th: "เครื่องนี้เก็บข้อมูลให้ไม่ได้", en: "This device cannot keep data" },
  mineNoStorageBody: {
    th: "เบราว์เซอร์ของคุณไม่ยอมให้หน้านี้เก็บข้อมูล อาจเป็นเพราะโหมดส่วนตัวหรือบล็อกข้อมูลเว็บไซต์ จึงไม่มีอะไรให้แสดง และปุ่มดาวหรือบันทึกจะไม่ทำงาน ส่วนอื่นของ \"กินอะไรดี\" ใช้ได้ตามปกติ",
    en: "Your browser is not letting this page keep data. It may be a private window or blocked site data. So there is nothing to show, and stars and saves will not work. The rest of What to eat works as usual.",
  },
  favouritesTitle: { th: "เมนูโปรด", en: "Favourites" },
  favouritesEmpty: { th: "ยังไม่มีเมนูโปรด กดปุ่มหัวใจบนการ์ดเมนูเพื่อเก็บไว้", en: "No favourites yet. Use the heart on any dish card to keep one." },
  historyTitle: { th: "ประวัติที่กดกินมื้อนี้", en: "What you tapped to eat" },
  historyEmpty: { th: "ยังไม่มีประวัติ จะขึ้นที่นี่เมื่อคุณกด \"กินมื้อนี้\"", en: "Nothing yet. It appears here when you tap \"I'll eat this\"." },
  historyMore: { th: "แสดงล่าสุดเท่านั้น", en: "Showing the latest only" },
  dislikesTitle: { th: "ไม่เอาอีกแล้ว", en: "Never suggest" },
  dislikesEmpty: { th: "ยังไม่มีเมนูที่ซ่อน", en: "No dishes hidden." },
  defaultsTitle: { th: "ตัวกรองที่ตั้งไว้", en: "Saved filters" },
  defaultsEmpty: { th: "ยังไม่ได้ตั้งตัวกรองเริ่มต้น", en: "No default filters saved." },
  defaultsSetFromCurrent: { th: "ตั้งตัวกรองตอนนี้เป็นค่าเริ่มต้น", en: "Save these filters as my defaults" },
  defaultsCurrentHint: { th: "ตัวกรองในลิงก์นี้:", en: "Filters in this link:" },
  defaultsNoCurrent: {
    th: "จะตั้งค่าเริ่มต้นได้จากตัวกรองที่เปิดอยู่ ไปที่หน้าเมนู ตั้งตัวกรอง แล้วกดลิงก์ไปที่นี่",
    en: "Defaults come from the filters you have on. Set filters on the dishes page, then come back here from there.",
  },
  defaultsUse: { th: "เปิดเมนูด้วยตัวกรองนี้", en: "Browse dishes with these" },
  defaultsClear: { th: "ล้างตัวกรองที่ตั้งไว้", en: "Clear saved filters" },
  defaultsSaved: { th: "ตั้งเป็นค่าเริ่มต้นแล้ว", en: "Saved as your defaults." },
  savedWeekTitle: { th: "แผนสัปดาห์ที่เก็บไว้", en: "Saved week" },
  savedWeekEmpty: { th: "ยังไม่ได้เก็บแผน ทำแผนที่หน้าแผนสัปดาห์แล้วกดเก็บ", en: "No week saved. Make one on Plan my week and save it." },
  savedWeekOpen: { th: "เปิดแผนนี้", en: "Open this plan" },
  savedWeekClear: { th: "ลบแผนที่เก็บไว้", en: "Remove saved week" },
  savedWeekSavedOn: { th: "เก็บไว้เมื่อ", en: "Saved on" },
  staleDish: { th: "ไม่มีในเมนูแล้ว", en: "No longer on the menu" },
  remove: { th: "เอาออก", en: "Remove" },
  clearTitle: { th: "ล้างทุกอย่าง", en: "Clear everything" },
  clearHint: { th: "ลบรายการโปรด ประวัติ ตัวกรอง และแผนที่เก็บไว้ในเครื่องนี้ทั้งหมด", en: "Deletes your favourites, history, filters and saved week from this device." },
  clearAsk: { th: "ล้างข้อมูลทั้งหมดในเครื่องนี้?", en: "Clear everything on this device?" },
  clearAskBody: { th: "ลบแล้วเอากลับไม่ได้ ข้อมูลอยู่ในเครื่องนี้ที่เดียว", en: "This cannot be undone. This device is the only place the data lives." },
  clearConfirm: { th: "ใช่ ล้างทั้งหมด", en: "Yes, clear everything" },
  clearCancel: { th: "ไม่ล้าง", en: "Keep it" },
  clearDone: { th: "ล้างข้อมูลในเครื่องนี้แล้ว", en: "Everything on this device is cleared." },
  clearFailed: { th: "ล้างไม่สำเร็จ เบราว์เซอร์ไม่ให้เข้าถึงข้อมูล", en: "Could not clear. The browser did not allow access to the data." },
  saveFailed: { th: "บันทึกไม่สำเร็จ", en: "Could not save that." },
  storageNote: {
    th: "ข้อมูลเก็บในเครื่องนี้ใต้ชื่อที่ขึ้นต้นด้วย trytpc.eat.v1. และไม่ส่งไปที่ไหน",
    en: "Kept on this device under names starting trytpc.eat.v1. and never sent anywhere.",
  },
  backToEat: { th: "กลับไปกินอะไรดี", en: "Back to What to eat" },
} as const satisfies Record<string, Bilingual>;

/** Weekday names by weekday number, 0 Sunday to 6 Saturday. */
export const WEEKDAY_NAME: readonly Bilingual[] = [
  { th: "วันอาทิตย์", en: "Sunday" },
  { th: "วันจันทร์", en: "Monday" },
  { th: "วันอังคาร", en: "Tuesday" },
  { th: "วันพุธ", en: "Wednesday" },
  { th: "วันพฤหัสบดี", en: "Thursday" },
  { th: "วันศุกร์", en: "Friday" },
  { th: "วันเสาร์", en: "Saturday" },
];

export const WEEKDAY_SHORT: readonly Bilingual[] = [
  { th: "อา.", en: "Sun" },
  { th: "จ.", en: "Mon" },
  { th: "อ.", en: "Tue" },
  { th: "พ.", en: "Wed" },
  { th: "พฤ.", en: "Thu" },
  { th: "ศ.", en: "Fri" },
  { th: "ส.", en: "Sat" },
];

/** Monday first, as a student reads a week. */
export const MONDAY_FIRST: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export const budget = {
  /** "10 baht left". */
  left(locale: Locale, amount: number): string {
    return locale === "th" ? `เหลือ ${n(amount, locale)} บาท` : `${n(amount, locale)} baht left`;
  },
  baht(locale: Locale, amount: number): string {
    return locale === "th" ? `${n(amount, locale)} บาท` : `${n(amount, locale)} baht`;
  },
  /** "Meals for 60 baht". */
  mealsFor(locale: Locale, amount: number): string {
    return locale === "th" ? `มื้อที่งบ ${n(amount, locale)} บาท` : `Meals for ${n(amount, locale)} baht`;
  },
  mealsFound(locale: Locale, count: number): string {
    return locale === "th" ? `พบ ${n(count, locale)} มื้อ` : `${n(count, locale)} ${count === 1 ? "meal" : "meals"} found`;
  },
  mealsShown(locale: Locale, shown: number): string {
    return locale === "th" ? `แสดง ${n(shown, locale)} มื้อแรก` : `Showing the first ${n(shown, locale)}`;
  },
  stalls(locale: Locale, count: number): string {
    return locale === "th" ? `${n(count, locale)} ร้าน` : `${n(count, locale)} ${count === 1 ? "stall" : "stalls"}`;
  },
  comboHeading(locale: Locale, position: number): string {
    return locale === "th" ? `มื้อที่ ${n(position, locale)}` : `Meal ${n(position, locale)}`;
  },
  raiseTo(locale: Locale, amount: number): string {
    return locale === "th" ? `เพิ่มงบเป็น ${n(amount, locale)} บาท จะได้มื้อที่พอดี` : `Raise your budget to ${n(amount, locale)} baht and meals fit`;
  },
  cheapestMain(locale: Locale, amount: number): string {
    return locale === "th" ? `จานหลักที่ถูกที่สุดตอนนี้ ${n(amount, locale)} บาท` : `The cheapest main right now is ${n(amount, locale)} baht.`;
  },
  weekSummary(locale: Locale, days: number, budgetAmount: number): string {
    return locale === "th"
      ? `${n(days, locale)} วัน งบ ${n(budgetAmount, locale)} บาท`
      : `${n(days, locale)} ${days === 1 ? "day" : "days"}, ${n(budgetAmount, locale)} baht`;
  },
  rerollLabel(locale: Locale, day: string): string {
    return `${locale === "th" ? "สุ่มใหม่" : "Reroll"}: ${day}`;
  },
  lockLabel(locale: Locale, day: string): string {
    return `${locale === "th" ? "ล็อก" : "Lock"}: ${day}`;
  },
  unlockLabel(locale: Locale, day: string): string {
    return `${locale === "th" ? "ปลดล็อก" : "Unlock"}: ${day}`;
  },
  fewerDays(locale: Locale, days: number): string {
    return locale === "th" ? `ลดเหลือ ${n(days, locale)} วัน` : `Plan ${n(days, locale)} ${days === 1 ? "day" : "days"} instead`;
  },
  /** "You've logged 230 of 400 baht this week". */
  logged(locale: Locale, spent: number, target: number): string {
    return locale === "th"
      ? `สัปดาห์นี้คุณบันทึกไว้ ${n(spent, locale)} จาก ${n(target, locale)} บาท`
      : `You've logged ${n(spent, locale)} of ${n(target, locale)} baht this week`;
  },
  loggedTotal(locale: Locale, spent: number): string {
    return locale === "th" ? `สัปดาห์นี้คุณบันทึกไว้ ${n(spent, locale)} บาท` : `You've logged ${n(spent, locale)} baht this week`;
  },
  overTarget(locale: Locale, over: number): string {
    return locale === "th" ? `เกินงบ ${n(over, locale)} บาท` : `${n(over, locale)} baht over`;
  },
  underTarget(locale: Locale, left: number): string {
    return locale === "th" ? `เหลืออีก ${n(left, locale)} บาท` : `${n(left, locale)} baht to go`;
  },
  removeNamed(locale: Locale, name: string): string {
    return `${locale === "th" ? "เอาออก" : "Remove"}: ${name}`;
  },
  historyLine(locale: Locale, price: number): string {
    return locale === "th" ? `จ่าย ${n(price, locale)} บาท (ราคาตอนกด)` : `${n(price, locale)} baht (price when tapped)`;
  },
  /** "Latest 30 of 120". */
  latestOf(locale: Locale, shown: number, total: number): string {
    return locale === "th" ? `ล่าสุด ${n(shown, locale)} จาก ${n(total, locale)}` : `Latest ${n(shown, locale)} of ${n(total, locale)}`;
  },
};
