import type { LocaleString } from "../config";

/** The Site text editor: every built-in string on the public site. */
export const SITE_TEXT_STRINGS = {
  typeSiteText: { th: "ข้อความในเว็บไซต์", en: "Site text" },
  typeSiteTextOne: { th: "ข้อความในเว็บไซต์", en: "Site text" },
  typeSiteTextDesc: {
    th: "แก้ไขข้อความที่ติดมากับเว็บไซต์ได้ทุกข้อความ เช่น ปุ่ม หัวข้อ คำแนะนำ และข้อความในอีเมล",
    en: "Change any of the site's built-in text: buttons, headings, instructions, notices and email wording",
  },
  sitIntro: {
    th: "ค้นหาข้อความที่ต้องการเปลี่ยน แก้ไขทั้งสองภาษา แล้วกดบันทึก การบันทึกมีผลกับข้อความในหน้านี้เท่านั้นและมีผลทันที หากลบข้อความในช่องใดจนว่าง เว็บไซต์จะกลับไปใช้ข้อความตั้งต้น",
    en: "Search for the text you want to change, edit it in both languages, then save. Saving changes only the text on this page, and takes effect straight away. Clear a field and the site goes back to its built-in text",
  },
  sitSearch: { th: "ค้นหาข้อความในเว็บไซต์", en: "Search site text" },
  sitSearchButton: { th: "ค้นหา", en: "Search" },
  sitFilterLabel: { th: "แสดง", en: "Show" },
  sitFilterAll: { th: "ทั้งหมด", en: "All" },
  sitFilterEdited: { th: "ที่แก้ไขแล้ว", en: "Edited" },
  sitGroup: { th: "กลุ่มข้อความ", en: "Group" },
  sitGroupAll: { th: "ทุกกลุ่ม", en: "All groups" },
  sitGroupApply: { th: "แสดง", en: "Show" },
  sitCount: { th: "{count} ข้อความ", en: "{count} strings" },
  sitEmpty: { th: "ไม่พบข้อความที่ตรงกับการค้นหา", en: "No text matches your search" },
  sitEditedMark: { th: "[แก้ไขแล้ว]", en: "[Edited]" },
  sitHintBuiltIn: { th: "ข้อความตั้งต้น: {th} / {en}", en: "Built-in text: {th} / {en}" },
  sitHintPlaceholders: {
    th: "ต้องคงคำในวงเล็บปีกกาไว้ ({list}) เว็บไซต์จะแทนที่ด้วยค่าจริง",
    en: "Keep the words in braces ({list}). The site fills them in",
  },
  sitErrPlaceholders: { th: "ต้องมี {list} เหมือนข้อความตั้งต้น", en: "Must keep {list}, like the built-in text" },
  sitErrTooLong: { th: "ยาวเกิน {max} ตัวอักษร", en: "Longer than {max} characters" },
} satisfies Record<string, LocaleString>;
