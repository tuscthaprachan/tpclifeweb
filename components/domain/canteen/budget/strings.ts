/**
 * Copy for the budget tools (/eat/plan) and personal data
 * (/eat/mine). Thai and English, written separately. No em dashes.
 */

import { editableStrings, fillText } from "@/lib/i18n/editable";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { Bilingual } from "../strings";
import { PICK } from "../pick/strings";

const n = formatNumber;

export const BUDGET = editableStrings(
  "canteen-budget",
  {
    /* ---- Meal ---- */
    mealTitle: { th: "มื้อนี้งบเท่านี้", en: "Meal for my budget" },
    mealIntro: {
      th: "บอกว่ามีกี่บาท เราจัดจานหลักบวกเครื่องดื่มหรือของหวานให้พอดีงบ",
      en: "Tell us how many baht you have. We put together a main, plus a drink or a dessert if it fits.",
    },
    mealFormTitle: { th: "งบของคุณ", en: "Your budget" },
    budgetLegend: { th: "มีกี่บาท", en: "How many baht do you have?" },
    budgetOtherChoice: { th: "จำนวนอื่น", en: "Other" },
    budgetOther: { th: "จำนวนเงิน (บาท)", en: "Amount in baht" },
    sameStall: { th: "ร้านเดียวพอ", en: "Same stall only" },
    sameStallHint: { th: "เครื่องดื่มและของหวานต้องมาจากร้านเดียวกับจานหลัก จะได้ไม่ต้องต่อคิวสองที่", en: "Drink and dessert come from the same stall as the main, so you queue once." },
    mealInvalid: {
      th: "ใส่จำนวนเงินเป็นบาท เป็นจำนวนเต็มตั้งแต่ 1 ถึง 5,000",
      en: "Enter a whole number of baht from 1 to 5,000.",
    },
    weekBudgetInvalid: {
      th: "ใส่จำนวนเงินเป็นบาท เป็นจำนวนเต็มตั้งแต่ 1 ถึง 20,000",
      en: "Enter a whole number of baht from 1 to 20,000.",
    },
    mealSubmit: { th: "หามื้อให้พอดีงบ", en: "Find meals" },
    mealPromptTitle: { th: "ใส่งบก่อน แล้วเราจะจัดให้", en: "Pick a budget and we will put meals together" },
    mealPromptBody: { th: "เลือกจำนวนเงินด้านบน หรือเลือก \"จำนวนอื่น\" แล้วพิมพ์เอง", en: "Choose an amount above, or pick Other and type your own." },
    randomCombo: { th: "สุ่มให้หนึ่งชุด", en: "Pick one for me" },
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
    saveWeekNote: { th: "เก็บในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน", en: "Stays on this device. Not sent anywhere." },
    replacesWeek: { th: "จะแทนที่สัปดาห์ที่เก็บไว้ก่อนหน้า", en: "This replaces the week you saved before." },
    openMine: { th: "ดูของฉัน", en: "Open Your stuff" },
    failNoDays: {
      th: "เลือกอย่างน้อยหนึ่งวันที่มามหาวิทยาลัย",
      en: "Select at least one day you are on campus",
    },
    failBadDays: { th: "วันที่เลือกไม่ถูกต้อง เลือกวันใหม่จากแบบฟอร์ม", en: "Those days are not valid. Choose the days again in the form." },
    failUnknownLock: {
      th: "เมนูที่ล็อกไว้ไม่อยู่ในรายการแล้ว อาจเอาออกจากเมนูไปแล้ว ปลดล็อกทุกวันแล้วจัดใหม่",
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
    spendNoTarget: { th: "ยังไม่ได้เก็บแผนสัปดาห์ไว้ จึงแสดงยอดรวมอย่างเดียว", en: "No saved week, so this is just the total." },

    /* ---- Mine ---- */
    mineTitle: { th: "ของฉัน", en: "Your stuff" },
    mineIntro: {
      th: "เมนูโปรด ประวัติ และแผนสัปดาห์ เก็บในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
      en: "Your favourites, history and week. They stay on this device and are not sent anywhere.",
    },
    mineNoJsTitle: { th: "ต้องเปิด JavaScript", en: "JavaScript is off" },
    mineNoJsBody: {
      th: "เปิด JavaScript เพื่อดูหน้านี้",
      en: "Turn on JavaScript to see this page.",
    },
    mineLoading: { th: "กำลังอ่านข้อมูลจากเครื่องนี้", en: "Reading from your device" },
    mineNoStorageTitle: { th: "เครื่องนี้เก็บข้อมูลให้ไม่ได้", en: "This device cannot keep data" },
    mineNoStorageBody: {
      th: "เบราว์เซอร์ไม่ยอมให้เก็บข้อมูล อาจเป็นเพราะโหมดส่วนตัว จึงยังไม่มีอะไรให้แสดง",
      en: "This browser will not keep data, perhaps because of a private window, so there is nothing to show.",
    },
    favouritesTitle: { th: "เมนูโปรด", en: "Favourites" },
    favouritesEmpty: { th: "ยังไม่มีเมนูโปรด กดปุ่มหัวใจบนการ์ดเมนูเพื่อเก็บไว้", en: "No favourites yet. Use the heart on any dish card to keep one." },
    historyTitle: { th: "ประวัติที่กดกินมื้อนี้", en: "What you tapped to eat" },
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
    clearHint: { th: "ลบเมนูโปรด ประวัติ ตัวกรอง และแผนที่เก็บไว้ในเครื่องนี้ทั้งหมด", en: "Deletes your favourites, history, filters and saved week from this device." },
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
  },
  { th: "โรงอาหาร: วางแผนมื้อตามงบ และหน้า ของฉัน", en: "Canteen: budget planner and Your stuff" },
);

const WEEKDAY = editableStrings(
  "canteen-weekdays",
  {
    name0: { th: "วันอาทิตย์", en: "Sunday" },
    name1: { th: "วันจันทร์", en: "Monday" },
    name2: { th: "วันอังคาร", en: "Tuesday" },
    name3: { th: "วันพุธ", en: "Wednesday" },
    name4: { th: "วันพฤหัสบดี", en: "Thursday" },
    name5: { th: "วันศุกร์", en: "Friday" },
    name6: { th: "วันเสาร์", en: "Saturday" },
    short0: { th: "อา.", en: "Sun" },
    short1: { th: "จ.", en: "Mon" },
    short2: { th: "อ.", en: "Tue" },
    short3: { th: "พ.", en: "Wed" },
    short4: { th: "พฤ.", en: "Thu" },
    short5: { th: "ศ.", en: "Fri" },
    short6: { th: "ส.", en: "Sat" },
  },
  { th: "โรงอาหาร: ชื่อวันในสัปดาห์", en: "Canteen: weekday names" },
);

/** Weekday names by weekday number, 0 Sunday to 6 Saturday. */
export const WEEKDAY_NAME: readonly Bilingual[] = [
  WEEKDAY.name0,
  WEEKDAY.name1,
  WEEKDAY.name2,
  WEEKDAY.name3,
  WEEKDAY.name4,
  WEEKDAY.name5,
  WEEKDAY.name6,
];

export const WEEKDAY_SHORT: readonly Bilingual[] = [
  WEEKDAY.short0,
  WEEKDAY.short1,
  WEEKDAY.short2,
  WEEKDAY.short3,
  WEEKDAY.short4,
  WEEKDAY.short5,
  WEEKDAY.short6,
];

/** Monday first, as a student reads a week. */
export const MONDAY_FIRST: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

const PHRASE = editableStrings(
  "canteen-budget-phrases",
  {
    left: { th: "เหลือ {amount} บาท", en: "{amount} baht left" },
    baht: { th: "{amount} บาท", en: "{amount} baht" },
    mealsFor: { th: "มื้อที่งบ {amount} บาท", en: "Meals for {amount} baht" },
    mealsFoundOne: { th: "พบ {count} มื้อ", en: "{count} meal found" },
    mealsFoundMany: { th: "พบ {count} มื้อ", en: "{count} meals found" },
    mealsShown: { th: "แสดง {shown} มื้อแรก", en: "Showing the first {shown}" },
    stallsOne: { th: "{count} ร้าน", en: "{count} stall" },
    stallsMany: { th: "{count} ร้าน", en: "{count} stalls" },
    comboHeading: { th: "มื้อที่ {position}", en: "Meal {position}" },
    raiseTo: { th: "เพิ่มงบเป็น {amount} บาท จะได้มื้อที่พอดี", en: "Raise your budget to {amount} baht and meals fit" },
    cheapestMain: { th: "จานหลักที่ถูกที่สุดตอนนี้ {amount} บาท", en: "The cheapest main right now is {amount} baht." },
    weekSummaryOne: { th: "{days} วัน งบ {budget} บาท", en: "{days} day, {budget} baht" },
    weekSummaryMany: { th: "{days} วัน งบ {budget} บาท", en: "{days} days, {budget} baht" },
    rerollLabel: { th: "สุ่มใหม่: {day}", en: "Reroll: {day}" },
    lockLabel: { th: "ล็อก: {day}", en: "Lock: {day}" },
    unlockLabel: { th: "ปลดล็อก: {day}", en: "Unlock: {day}" },
    fewerDaysOne: { th: "ลดเหลือ {days} วัน", en: "Plan {days} day instead" },
    fewerDaysMany: { th: "ลดเหลือ {days} วัน", en: "Plan {days} days instead" },
    logged: { th: "สัปดาห์นี้บันทึกไว้ {spent} จาก {target} บาท", en: "You've logged {spent} of {target} baht this week" },
    loggedTotal: { th: "สัปดาห์นี้บันทึกไว้ {spent} บาท", en: "You've logged {spent} baht this week" },
    overTarget: { th: "เกินงบ {over} บาท", en: "{over} baht over" },
    underTarget: { th: "เหลืออีก {left} บาท", en: "{left} baht to go" },
    removeNamed: { th: "เอาออก: {name}", en: "Remove: {name}" },
    removedNamed: { th: "เอาออกแล้ว: {name}", en: "Removed: {name}" },
    historyLine: { th: "จ่าย {price} บาท (ราคาตอนกด)", en: "{price} baht (price when tapped)" },
    latestOf: { th: "ล่าสุด {shown} จาก {total}", en: "Latest {shown} of {total}" },
    spendOnlyNote: { th: 'นับเฉพาะมื้อที่คุณกด "{eatThis}" ไว้ สัปดาห์เริ่มวันจันทร์', en: 'Counts only what you tapped "{eatThis}" for. The week starts on Monday.' },
    historyEmpty: { th: 'ยังไม่มีประวัติ จะขึ้นที่นี่เมื่อคุณกด "{eatThis}"', en: 'Nothing yet. It appears here when you tap "{eatThis}".' },
  },
  { th: "โรงอาหาร: วางแผนมื้อตามงบ ข้อความที่มีตัวเลขและชื่อแทรก", en: "Canteen: budget planner, texts with numbers and names in them" },
);

export const budget = {
  /** "10 baht left". */
  left(locale: Locale, amount: number): string {
    return fillText(PHRASE.left[locale], { amount: n(amount, locale) });
  },
  baht(locale: Locale, amount: number): string {
    return fillText(PHRASE.baht[locale], { amount: n(amount, locale) });
  },
  /** "Meals for 60 baht". */
  mealsFor(locale: Locale, amount: number): string {
    return fillText(PHRASE.mealsFor[locale], { amount: n(amount, locale) });
  },
  mealsFound(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.mealsFoundOne : PHRASE.mealsFoundMany)[locale], { count: n(count, locale) });
  },
  mealsShown(locale: Locale, shown: number): string {
    return fillText(PHRASE.mealsShown[locale], { shown: n(shown, locale) });
  },
  stalls(locale: Locale, count: number): string {
    return fillText((count === 1 ? PHRASE.stallsOne : PHRASE.stallsMany)[locale], { count: n(count, locale) });
  },
  comboHeading(locale: Locale, position: number): string {
    return fillText(PHRASE.comboHeading[locale], { position: n(position, locale) });
  },
  raiseTo(locale: Locale, amount: number): string {
    return fillText(PHRASE.raiseTo[locale], { amount: n(amount, locale) });
  },
  cheapestMain(locale: Locale, amount: number): string {
    return fillText(PHRASE.cheapestMain[locale], { amount: n(amount, locale) });
  },
  weekSummary(locale: Locale, days: number, budgetAmount: number): string {
    return fillText((days === 1 ? PHRASE.weekSummaryOne : PHRASE.weekSummaryMany)[locale], { days: n(days, locale), budget: n(budgetAmount, locale) });
  },
  rerollLabel(locale: Locale, day: string): string {
    return fillText(PHRASE.rerollLabel[locale], { day });
  },
  lockLabel(locale: Locale, day: string): string {
    return fillText(PHRASE.lockLabel[locale], { day });
  },
  unlockLabel(locale: Locale, day: string): string {
    return fillText(PHRASE.unlockLabel[locale], { day });
  },
  fewerDays(locale: Locale, days: number): string {
    return fillText((days === 1 ? PHRASE.fewerDaysOne : PHRASE.fewerDaysMany)[locale], { days: n(days, locale) });
  },
  /** "You've logged 230 of 400 baht this week". */
  logged(locale: Locale, spent: number, target: number): string {
    return fillText(PHRASE.logged[locale], { spent: n(spent, locale), target: n(target, locale) });
  },
  loggedTotal(locale: Locale, spent: number): string {
    return fillText(PHRASE.loggedTotal[locale], { spent: n(spent, locale) });
  },
  overTarget(locale: Locale, over: number): string {
    return fillText(PHRASE.overTarget[locale], { over: n(over, locale) });
  },
  underTarget(locale: Locale, left: number): string {
    return fillText(PHRASE.underTarget[locale], { left: n(left, locale) });
  },
  removeNamed(locale: Locale, name: string): string {
    return fillText(PHRASE.removeNamed[locale], { name });
  },
  /** "Removed: Pad kra pao". */
  removedNamed(locale: Locale, name: string): string {
    return fillText(PHRASE.removedNamed[locale], { name });
  },
  historyLine(locale: Locale, price: number): string {
    return fillText(PHRASE.historyLine[locale], { price: n(price, locale) });
  },
  /** "Latest 30 of 120". */
  latestOf(locale: Locale, shown: number, total: number): string {
    return fillText(PHRASE.latestOf[locale], { shown: n(shown, locale), total: n(total, locale) });
  },
  /** The note under the week's spend. Names the "Go with this" button as it is worded now. */
  spendOnlyNote(locale: Locale): string {
    return fillText(PHRASE.spendOnlyNote[locale], { eatThis: PICK.eatThis[locale] });
  },
  /** The empty history line. Names the "Go with this" button as it is worded now. */
  historyEmpty(locale: Locale): string {
    return fillText(PHRASE.historyEmpty[locale], { eatThis: PICK.eatThis[locale] });
  },
};
