import type { LocaleString } from "../config";

/** Staff console strings for the borrowing availability calendar (/admin/borrowing/calendar). */
export const BORROWING_CALENDAR_STRINGS = {
  bcalTitle: { th: "ปฏิทินอุปกรณ์ว่าง", en: "Availability calendar" },
  bcalIntro: {
    th: "ดูว่าอุปกรณ์แต่ละรายการว่างวันไหน พร้อมการจองของแต่ละวัน จำนวนคำนวณจากการจองที่มีอยู่ ไม่ใช่ข้อมูลสด",
    en: "See which days each item is free, with the bookings on each day. Counts are worked out from existing bookings and are not live.",
  },
  bcalCardTitle: { th: "รายการที่เลือก", en: "Selected item" },
  bcalPickTitle: { th: "เลือกอุปกรณ์", en: "Choose an item" },
  bcalPickBody: { th: "เลือกรายการเพื่อดูปฏิทินรายเดือน รวมรายการที่ปิดใช้งาน", en: "Choose an item to see its month, including items that are switched off." },
  bcalNotFound: { th: "ไม่พบรายการที่เลือก", en: "That item was not found." },
  bcalNoItems: { th: "ยังไม่มีอุปกรณ์ในระบบ", en: "There is no equipment in the system yet." },
  bcalPublicLink: { th: "ดูหน้าสำหรับผู้ยืม", en: "View the borrower page" },
  bcalUnavailable: { th: "ยังเชื่อมต่อฐานข้อมูลไม่ได้ จึงแสดงปฏิทินไม่ได้", en: "The database is not connected, so the calendar cannot be shown." },
} as const satisfies Record<string, LocaleString>;
