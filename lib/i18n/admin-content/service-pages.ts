import type { LocaleString } from "../config";

/** The Service pages settings: the wording on each service's start page. */
export const SERVICE_PAGES_STRINGS = {
  typeServicePages: { th: "หน้าเริ่มต้นบริการ", en: "Service pages" },
  typeServicePagesOne: { th: "ข้อความในหน้าเริ่มต้นบริการ", en: "Service page text" },
  typeServicePagesDesc: {
    th: "คำแนะนำและสิ่งที่ต้องเตรียมในหน้าเริ่มต้นของการยืมอุปกรณ์ การแจ้งปัญหา ของหาย และหน้าแจ้งเรื่อง",
    en: "The instructions and \"you will need\" lists on the borrowing, issue reporting, lost and found and Report start pages",
  },
  svpIntro: {
    th: "แต่ละช่องแสดงข้อความที่เว็บไซต์ใช้อยู่ แก้ไขได้ทั้งสองภาษา หากลบข้อความในช่องใดจนว่าง เว็บไซต์จะกลับไปใช้ข้อความตั้งต้น การบันทึกมีผลทันที",
    en: "Each field shows the text the site uses now. Edit it in both languages. Clear a field and the site goes back to its built-in text. Saving takes effect straight away",
  },
  svpHintList: { th: "หนึ่งรายการต่อหนึ่งบรรทัด", en: "One item per line" },
  svpHintPlaceholders: {
    th: "ต้องคงคำในวงเล็บปีกกาไว้ ({list}) เว็บไซต์จะแทนที่ด้วยตัวเลขจริง",
    en: "Keep the words in braces ({list}). The site fills them in with the real numbers",
  },
  svpViewPage: { th: "ดูหน้านี้", en: "View this page" },
  svpErrPlaceholders: {
    th: "{label}: ต้องมี {list} เหมือนข้อความตั้งต้น",
    en: "{label}: must keep {list}, like the built-in text",
  },
} satisfies Record<string, LocaleString>;
