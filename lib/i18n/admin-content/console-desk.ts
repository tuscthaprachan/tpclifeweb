import type { LocaleString } from "../config";

/** Desk: case inbox layout and the Loans tabs. */
export const CONSOLE_DESK_STRINGS = {
  dkIntro: { th: "เรื่องที่ยังเปิดอยู่จะแสดงก่อน ค้นหาหรือกรองเพื่อดูเรื่องอื่น", en: "Open cases first. Search or filter to find the rest" },
  dkLogMenu: { th: "บันทึกที่เคาน์เตอร์", en: "Log at counter" },
  dkLogFound: { th: "บันทึกของที่พบ", en: "Log a found item" },
  dkLogLost: { th: "รับแจ้งของหาย", en: "Take a lost report" },
  dkServiceTabs: { th: "ประเภทบริการ", en: "Service" },
  dkTabAll: { th: "ทั้งหมด", en: "All" },
  dkTabLostFound: { th: "ของหายและของที่พบ", en: "Lost and found" },
  dkTabComplaint: { th: "ข้อร้องเรียน", en: "Complaints" },
  dkTabBorrowing: { th: "ยืมอุปกรณ์", en: "Loans" },
  dkMoreFilters: { th: "ตัวกรองเพิ่มเติม", en: "More filters" },
  dkMoreActions: { th: "เมนูอื่น ๆ", en: "More actions" },
  dkLoanTabs: { th: "ส่วนของงานยืมอุปกรณ์", en: "Loans sections" },
  dkLoanToday: { th: "วันนี้", en: "Today" },
  dkLoanCalendar: { th: "ปฏิทิน", en: "Calendar" },
  dkLoanInventory: { th: "รายการอุปกรณ์", en: "Inventory" },
  dkLoanAll: { th: "คำขอยืมทั้งหมด", en: "All loans" },
  dkNothingIn: { th: "ไม่มีรายการใน: {list}", en: "Nothing in: {list}" },
} as const satisfies Record<string, LocaleString>;
