/**
 * Copy shared by the two "about" pages (TUSU and TUSC). Neither
 * `lib/i18n/strings.ts` nor `data/harvested-inventory.ts` carries page-level
 * prose like this, only vocabulary and raw source facts, so it lives here
 * per CONTRIBUTING.md's instruction for a missing shared string: hardcoded,
 * both languages, reported as a gap rather than invented into the fixed file.
 *
 * Every fact stated here comes from `data/harvested-inventory.ts`
 * (`STUDENT_BODIES`, `SOURCE_DOCUMENTS`). Nothing here states a history, an
 * office holder or an achievement that is not already in that harvested
 * record, per this agent's brief.
 */

import type { Locale, LocaleString } from "@/lib/i18n/config";

// TODO: add to UI strings.
export const ESTABLISHED_LABEL: LocaleString = { th: "ก่อตั้งเมื่อ", en: "Established" };

// TODO: add to UI strings.
export const ROLE_LABEL: LocaleString = { th: "บทบาท", en: "Role" };

// TODO: add to UI strings.
export const HOW_THEY_RELATE_LABEL: LocaleString = { th: "ความสัมพันธ์ระหว่างสององค์กร", en: "How the two bodies relate" };

// TODO: add to UI strings.
export const RELATION_TEXT: LocaleString = {
  th: "อมธ. ท่าพระจันทร์เป็นฝ่ายบริหาร จัดสรรงบประมาณและดำเนินกิจกรรมของนักศึกษา ส่วนสภานักศึกษา ท่าพระจันทร์เป็นฝ่ายนิติบัญญัติและตรวจสอบ พิจารณาอนุมัติระเบียบและตรวจสอบการดำเนินงาน นโยบาย และงบประมาณของ อมธ. ทั้งสององค์กรจึงทำงานคู่กัน ไม่ใช่องค์กรเดียวกัน",
  en: "TUSU Tha Prachan is the executive body: it allocates budget and runs student activities. TUSC Tha Prachan is the legislative and scrutiny body: it approves the rules TUSU works under and scrutinises TUSU's decisions, policies and budget. The two work alongside each other, not as one body.",
};

// TODO: add to UI strings.
export const GOVERNED_BY_LABEL: LocaleString = { th: "อยู่ภายใต้ระเบียบ", en: "Governed by" };

// TODO: add to UI strings.
export const READ_REGULATION_LABEL: LocaleString = { th: "อ่านข้อบังคับฉบับเต็ม", en: "Read the full regulation" };

// TODO: add to UI strings.
export const CAMPUS_REFORM_LABEL: LocaleString = { th: "สภานักศึกษาประจำแต่ละศูนย์การศึกษา", en: "Campus-level student councils" };

// TODO: add to UI strings.
export const CAMPUS_REFORM_TEXT: LocaleString = {
  th: "ตั้งแต่ พ.ศ. 2563 แต่ละศูนย์การศึกษาของมหาวิทยาลัยธรรมศาสตร์มีสภานักศึกษาของตนเอง ดูแลกิจการเฉพาะของศูนย์การศึกษานั้น สภานักศึกษา ท่าพระจันทร์ในหน้านี้จึงหมายถึงสภาประจำท่าพระจันทร์โดยเฉพาะ ไม่ใช่สภานักศึกษาส่วนกลางของมหาวิทยาลัย",
  en: "Since 2020 each Thammasat University campus has had its own elected student council covering that campus's own affairs. TUSC Tha Prachan, referred to throughout this site, is specifically the Tha Prachan campus council, not the university's central student council.",
};

// TODO: add to UI strings.
export const VIEW_TUSU_POLICIES_LABEL: LocaleString = { th: "ดูความคืบหน้านโยบายของ อมธ. ท่าพระจันทร์", en: "View TUSU Tha Prachan's policy progress" };

// TODO: add to UI strings.
export const VIEW_TUSC_POLICIES_LABEL: LocaleString = {
  th: "ดูความคืบหน้านโยบายของสภานักศึกษา ท่าพระจันทร์",
  en: "View TUSC Tha Prachan's policy progress",
};

/**
 * `STUDENT_BODIES.tusu.established` / `.tusc.established` are plain
 * Gregorian years (data/harvested-inventory.ts has no full date to format
 * with `formatDate`, only a year). Thai renders in the Buddhist calendar
 * everywhere else on the site (lib/i18n/format.ts), so the same +543
 * conversion is applied here by hand for consistency. A year is never
 * grouped with a thousands separator (matching how the regulation's own
 * year, "พ.ศ. 2563", already appears in STUDENT_BODIES.governedBy), so this
 * intentionally does not use `formatNumber`.
 */
export function establishedYearLabel(gregorianYear: number, locale: Locale): string {
  const year = locale === "th" ? gregorianYear + 543 : gregorianYear;
  const prefix = locale === "th" ? "พ.ศ. " : "";
  return `${prefix}${year}`;
}
