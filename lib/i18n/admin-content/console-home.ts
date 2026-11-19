import type { LocaleString } from "../config";

/** Console dashboard, account page and global search strings. Keys start with `ch`. */
export const CONSOLE_HOME_STRINGS = {
  chGreeting: { th: "สวัสดี {name}", en: "Hello, {name}" },
  chSummaryNone: { th: "ขณะนี้ไม่มีรายการที่ต้องดำเนินการ", en: "Nothing needs your attention right now." },
  chSummaryOne: { th: "มี 1 รายการที่ต้องดำเนินการ", en: "1 item needs your attention." },
  chSummaryMany: { th: "มี {count} รายการที่ต้องดำเนินการ", en: "{count} items need your attention." },
  chSummaryPlain: { th: "ภาพรวมงานวันนี้", en: "Here is your work at a glance." },
  chUntitled: { th: "ไม่มีชื่อ", en: "Untitled" },
  chAccountTitle: { th: "บัญชีของคุณ", en: "Your account" },
  chAccountIntro: { th: "ข้อมูลที่ใช้ยืนยันตัวตนและสิทธิ์ของคุณในคอนโซล", en: "Who you are signed in as, and what you can do in the console." },
  chAccountSessionTitle: { th: "เซสชันและความปลอดภัย", en: "Session and security" },
  chAccountSecurityHint: { th: "จัดการพาสคีย์และการเข้าสู่ระบบ", en: "Manage your passkeys and sign-in." },
  chSearchContent: { th: "เนื้อหา: {type}", en: "Content: {type}" },
  chSearchCases: { th: "เรื่องที่ได้รับ", en: "Cases" },
} as const satisfies Record<string, LocaleString>;
