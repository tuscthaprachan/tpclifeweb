/**
 * Strings for the borrowing availability calendar, in Thai and English.
 *
 * Counts are worked out from bookings already made, so the wording says guide
 * and never live (CONTRIBUTING.md, Honesty). No em dashes. Plain module, safe
 * from server and client components.
 */

import { type Locale, type LocaleString } from "@/lib/i18n/config";

const TAG: Record<Locale, string> = { th: "th-TH-u-ca-buddhist", en: "en-GB" };

export const AVAIL = {
  title: { th: "ตรวจสอบอุปกรณ์ว่าง", en: "Equipment availability" },
  intro: {
    th: "เลือกอุปกรณ์เพื่อดูว่าวันไหนยังว่าง หรือดูทุกรายการในวันเดียว",
    en: "Choose an item to see which days it is free, or look at every item on one day.",
  },
  breadcrumbBorrow: { th: "ยืมอุปกรณ์", en: "Borrow equipment" },
  breadcrumbSelf: { th: "ตรวจสอบอุปกรณ์ว่าง", en: "Availability" },
  guideNote: {
    th: "จำนวนที่แสดงคำนวณจากการจองที่มีอยู่แล้ว เป็นเพียงแนวทาง และคำขอยืมจะเป็นผู้ยืนยันจำนวนอีกครั้ง",
    en: "These counts are worked out from bookings already made. They are a guide, and your request confirms them.",
  },
  startRequest: { th: "เริ่มส่งคำขอยืม", en: "Start a request" },
  unavailableTitle: { th: "ใช้บริการนี้ไม่ได้ในขณะนี้", en: "This service is not available right now" },
  unavailableBody: { th: "ยังดูอุปกรณ์ว่างไม่ได้ในขณะนี้ โปรดลองใหม่ภายหลัง", en: "Availability cannot be shown at the moment. Please try again later." },
  notFound: { th: "ไม่พบอุปกรณ์ที่เลือก โปรดเลือกรายการจากรายชื่อ", en: "We could not find that item. Choose one from the list." },

  /* Chooser */
  chooserLabel: { th: "เลือกอุปกรณ์", en: "Choose an item" },
  chooserPlaceholder: { th: "เลือกรายการ", en: "Choose an item" },
  chooserSubmit: { th: "ดูวันที่ว่าง", en: "Show availability" },
  dayFormLabel: { th: "หรือดูทุกรายการในวันเดียว", en: "Or see every item on one day" },
  dayFormInput: { th: "วันที่", en: "Date" },
  dayFormSubmit: { th: "ดูวันนี้", en: "Show this day" },

  /* Month */
  monthNav: { th: "เลื่อนเดือน", en: "Change month" },
  previousMonth: { th: "เดือนก่อนหน้า", en: "Previous month" },
  nextMonth: { th: "เดือนถัดไป", en: "Next month" },
  captionFor: { th: "{item} ประจำเดือน {month}", en: "{item}, {month}" },
  lendableStock: { th: "จำนวนที่ให้ยืมได้ทั้งหมด {count} {unit}", en: "Total that can be lent: {count}" },
  category: { th: "หมวด", en: "Category" },
  inactiveTag: { th: "ปิดใช้งาน", en: "switched off" },
  inactiveNote: { th: "รายการนี้ปิดใช้งานอยู่ จึงไม่แสดงต่อผู้ยืม", en: "This item is switched off, so borrowers cannot see it." },
  earliestNote: { th: "หมวดนี้ต้องขอล่วงหน้า วันที่รับได้เร็วที่สุดคือ {date}", en: "This category needs notice. The earliest collection day is {date}." },
  calendarOf: { th: "ปฏิทินรายวัน", en: "Daily calendar" },
  dayList: { th: "รายการรายวัน", en: "Days of the month" },

  /* Day status words */
  free: { th: "ว่าง {count}", en: "{count} free" },
  none: { th: "ไม่ว่าง", en: "None free" },
  closed: { th: "ปิดทำการ", en: "Closed" },
  tooSoon: { th: "ยังจองไม่ได้ ต้องขอล่วงหน้า", en: "Too soon to book" },
  past: { th: "ผ่านไปแล้ว", en: "Past" },
  booked: { th: "ถูกจอง {count}", en: "{count} booked" },

  /* Legend */
  legend: { th: "คำอธิบาย", en: "Key" },
  legendFree: { th: "ยังมีว่างตลอดทั้งวัน", en: "Some are free all day" },
  legendNone: { th: "ไม่มีว่างตลอดทั้งวัน", en: "None are free all day" },
  legendClosed: { th: "เคาน์เตอร์ปิดทำการ", en: "The desk is closed" },
  legendTooSoon: { th: "ใกล้เกินกว่าระยะเวลาที่ต้องขอล่วงหน้า", en: "Inside the notice period" },
  legendPast: { th: "วันที่ผ่านไปแล้ว", en: "A day that has gone" },

  /* Day view */
  dayHeading: { th: "อุปกรณ์ว่างวันที่ {date}", en: "Equipment free on {date}" },
  dayClosed: { th: "เคาน์เตอร์ปิดทำการในวันนี้ จึงรับหรือคืนอุปกรณ์ไม่ได้", en: "The desk is closed on this day, so equipment cannot be collected or returned." },
  dayPast: { th: "วันนี้ผ่านไปแล้ว", en: "This day has already passed." },
  dayTooSoon: { th: "หมวดนี้ต้องขอล่วงหน้า จึงยังจองวันนี้ไม่ได้", en: "This category needs notice, so it cannot be booked for this day yet." },
  dayCaption: { th: "{category} วันที่ {date}", en: "{category} on {date}" },
  colItem: { th: "รายการ", en: "Item" },
  colFree: { th: "ว่างวันนี้", en: "Free that day" },
  colTotal: { th: "ให้ยืมได้ทั้งหมด", en: "Can be lent in total" },
  viewMonth: { th: "ดูทั้งเดือน", en: "See the month" },
  backToMonth: { th: "กลับไปดูทั้งเดือน", en: "Back to the month" },
  noItems: { th: "ยังไม่มีอุปกรณ์ให้แสดง", en: "There are no items to show yet." },

  /* Staff */
  bookings: { th: "การจอง", en: "Bookings" },
  noBookings: { th: "ไม่มีการจอง", en: "No bookings" },
  bookingQuantity: { th: "จำนวน {count}", en: "Quantity {count}" },
} as const satisfies Record<string, LocaleString>;

type Key = keyof typeof AVAIL;

export function av(key: Key, locale: Locale, values?: Record<string, string | number>): string {
  const text: string = AVAIL[key][locale];
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** "March 2026" / "มีนาคม 2569" for a `YYYY-MM` key. */
export function monthLabel(month: string, locale: Locale): string {
  return new Intl.DateTimeFormat(TAG[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

/** The weekday names, Sunday first, in full and abbreviated form. */
export function weekdayNames(locale: Locale): Array<{ full: string; short: string }> {
  const out: Array<{ full: string; short: string }> = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(Date.UTC(2026, 2, 8 + i));
    const f = (style: "long" | "short") => new Intl.DateTimeFormat(TAG[locale], { weekday: style, timeZone: "UTC" }).format(d);
    out.push({ full: f("long"), short: f("short") });
  }
  return out;
}

