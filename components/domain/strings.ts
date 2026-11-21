import { editableStrings } from "@/lib/i18n/editable";

/** Small labels used by the forms, policy and shuttle components. */
export const DOMAIN_TEXT = editableStrings(
  "domain-lists",
  {
    formsSignInFilter: { th: "การเข้าสู่ระบบ", en: "Sign in" },
    formsNoMatch: { th: "ไม่พบแบบฟอร์มที่ตรงกับตัวกรองที่เลือก", en: "No forms match these filters" },
    formsPriorityHeading: { th: "แบบฟอร์มที่ใช้บ่อย", en: "Frequently used forms" },
    formSignInRequired: { th: "ต้องเข้าสู่ระบบ", en: "Sign in required" },
    formSignInRequiredTu: { th: "ต้องเข้าสู่ระบบด้วยบัญชี TU", en: "Sign in required (TU account)" },
    formNoSignIn: { th: "ไม่ต้องเข้าสู่ระบบ", en: "No sign in needed" },
    policyAreaLabel: { th: "ประเด็นนโยบาย", en: "Policy area" },
    policyNoMatch: { th: "ไม่พบนโยบายที่ตรงกับตัวกรองที่เลือก", en: "No policies match these filters" },
    policyProgressLabel: { th: "ความคืบหน้า", en: "Progress" },
    policyNoMovement: { th: "ไม่มีความเคลื่อนไหวมานานกว่าหนึ่งปี", en: "No movement in over a year" },
    shuttleNoTimetable: { th: "ยังไม่ได้เผยแพร่ตารางเวลาของเส้นทางนี้", en: "A timetable for this route has not been published yet" },
  },
  { th: "ป้ายและข้อความในแบบฟอร์ม นโยบาย และรถรับส่ง", en: "Forms, policy and shuttle labels" },
);
