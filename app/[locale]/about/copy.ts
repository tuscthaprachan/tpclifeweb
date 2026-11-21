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

import type { Locale } from "@/lib/i18n/config";
import { editableStrings } from "@/lib/i18n/editable";

export const ABOUT_TEXT = editableStrings(
  "page-about",
  {
    established: { th: "ก่อตั้งเมื่อ", en: "Established" },
    role: { th: "บทบาท", en: "Role" },
    howTheyRelate: { th: "ความสัมพันธ์ระหว่างสององค์กร", en: "How the two bodies relate" },
    relation: {
      th: "อมธ. ท่าพระจันทร์เป็นฝ่ายบริหาร จัดสรรงบประมาณและดำเนินกิจกรรมของนักศึกษา ส่วนสภานักศึกษา ท่าพระจันทร์ เป็นฝ่ายนิติบัญญัติและตรวจสอบ ทำหน้าที่พิจารณาอนุมัติระเบียบ และตรวจสอบการดำเนินงาน นโยบาย และงบประมาณของ อมธ. ทั้งสององค์กรแยกจากกันและทำงานคู่กัน",
      en: "TUSU Tha Prachan is the executive body: it allocates budget and runs student activities. TUSC Tha Prachan is the legislative and scrutiny body: it approves the rules TUSU works under and scrutinises TUSU's decisions, policies and budget. The two are separate bodies that work alongside each other.",
    },
    governedBy: { th: "อยู่ภายใต้ระเบียบ", en: "Governed by" },
    readRegulation: { th: "อ่านข้อบังคับฉบับเต็ม", en: "Read the full regulation" },
    campusReformLabel: { th: "สภานักศึกษาประจำแต่ละศูนย์การศึกษา", en: "Campus-level student councils" },
    campusReformText: {
      th: "ตั้งแต่ พ.ศ. 2563 ศูนย์การศึกษาแต่ละแห่งของมหาวิทยาลัยธรรมศาสตร์มีสภานักศึกษาของตนเอง ดูแลเรื่องเฉพาะของศูนย์นั้น ดังนั้นในเว็บไซต์นี้ สภานักศึกษา ท่าพระจันทร์ จึงหมายถึงสภานักศึกษาประจำธรรมศาสตร์ท่าพระจันทร์โดยเฉพาะ ไม่ใช่สภานักศึกษาส่วนกลางของมหาวิทยาลัย",
      en: "Since 2020 each Thammasat University campus has had its own elected student council covering that campus's own affairs. TUSC Tha Prachan, referred to throughout this site, is specifically the Thammasat Tha Prachan campus council, not the university's central student council.",
    },
    viewTusuPolicies: { th: "ดูความคืบหน้านโยบายของ อมธ. ท่าพระจันทร์", en: "View TUSU Tha Prachan's policy progress" },
    yearPrefix: { th: "พ.ศ. ", en: "" },
    viewTuscPolicies: {
      th: "ดูความคืบหน้านโยบายของสภานักศึกษา ท่าพระจันทร์",
      en: "View TUSC Tha Prachan's policy progress",
    },
  },
  { th: "หน้าเกี่ยวกับองค์กรนักศึกษา", en: "About the student bodies pages" },
);

export const ESTABLISHED_LABEL = ABOUT_TEXT.established;
export const ROLE_LABEL = ABOUT_TEXT.role;
export const HOW_THEY_RELATE_LABEL = ABOUT_TEXT.howTheyRelate;
export const RELATION_TEXT = ABOUT_TEXT.relation;
export const GOVERNED_BY_LABEL = ABOUT_TEXT.governedBy;
export const READ_REGULATION_LABEL = ABOUT_TEXT.readRegulation;
export const CAMPUS_REFORM_LABEL = ABOUT_TEXT.campusReformLabel;
export const CAMPUS_REFORM_TEXT = ABOUT_TEXT.campusReformText;
export const VIEW_TUSU_POLICIES_LABEL = ABOUT_TEXT.viewTusuPolicies;
export const VIEW_TUSC_POLICIES_LABEL = ABOUT_TEXT.viewTuscPolicies;

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
  const prefix = ABOUT_TEXT.yearPrefix[locale];
  return `${prefix}${year}`;
}
