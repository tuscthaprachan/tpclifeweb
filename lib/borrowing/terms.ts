/**
 * The borrowing terms, rewritten from the six clauses every paper form
 * carried. Five were shared word for word; the sixth differed by category and
 * lives on the category (`equipment_categories.terms_*`). The paper's "no
 * urgent requests in any case" is enforced by the notice period instead of
 * being stated as a rule. Changing this wording means bumping TERMS_VERSION.
 */

import type { LocaleString } from "@/lib/i18n/config";

export const SHARED_TERMS: readonly LocaleString[] = [
  {
    th: "ตรวจสภาพอุปกรณ์ต่อหน้าเจ้าหน้าที่ตอนรับ และแจ้งทันทีหากพบว่าชำรุด",
    en: "Check the equipment with staff when you collect it, and say straight away if anything is damaged",
  },
  {
    th: "ใช้อุปกรณ์ตามสภาพเดิม ห้ามดัดแปลงหรือปรับแต่ง",
    en: "Use the equipment as it is. Do not modify or adjust it",
  },
  {
    th: "หากอุปกรณ์ชำรุดหรือสูญหาย ผู้ยืมชดใช้ตามราคาอุปกรณ์ในปัจจุบัน",
    en: "If anything is damaged or lost, you pay for it at its current price",
  },
  {
    th: "คืนอุปกรณ์ภายในวันเวลาที่นัดไว้ หากคืนช้าอาจถูกดำเนินการทางวินัยและกฎหมาย",
    en: "Return the equipment by the time you booked. Late returns can lead to disciplinary or legal action",
  },
  {
    th: "นำบัตรนักศึกษาหรือบัตรประชาชนตัวจริงมาวางไว้เป็นหลักประกันตอนรับอุปกรณ์ และรับคืนเมื่อคืนอุปกรณ์ครบ",
    en: "Leave your original student card or national ID card with staff when you collect, and get it back when everything is returned",
  },
];
