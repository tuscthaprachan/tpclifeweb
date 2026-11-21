import { editableStrings } from "@/lib/i18n/editable";

export const FORM_DETAIL_TEXT = editableStrings(
  "page-form-detail",
  {
    signInAccountNoteGoogle: {
      th: "เข้าสู่ระบบที่แบบฟอร์มภายนอก ใช้บัญชี Google ของมหาวิทยาลัยธรรมศาสตร์ (บัญชี TU) ก่อนกรอก",
      en: "Sign in on the external form. Use your Thammasat (TU) Google account before filling it in",
    },
    signInAccountNoteTuAccount: {
      th: "เข้าสู่ระบบที่แบบฟอร์มภายนอก ใช้บัญชีมหาวิทยาลัยธรรมศาสตร์ (บัญชี TU) ก่อนกรอก",
      en: "Sign in on the external form. Use your Thammasat (TU) account before filling it in",
    },
    signInAccountNoteOther: {
      th: "เข้าสู่ระบบที่แบบฟอร์มภายนอก สอบถามผู้รับผิดชอบด้านล่างว่าต้องใช้บัญชีใด",
      en: "Sign in on the external form. Check which account you need with the contact below",
    },
    emailStartLabel: {
      th: "ส่งอีเมลเพื่อดำเนินการ",
      en: "Email to proceed",
    },
    lineStartLabel: {
      th: "เปิดแชท LINE เพื่อดำเนินการ",
      en: "Open LINE chat to proceed",
    },
    inPersonNote: {
      th: "แบบฟอร์มนี้ดำเนินการด้วยตนเองที่หน่วยงาน ไม่มีลิงก์สำหรับกรอกออนไลน์",
      en: "This form is handled in person at the office. There is no online link to fill in",
    },
    noDestinationNote: {
      th: "ยังไม่มีลิงก์สำหรับแบบฟอร์มนี้ ติดต่อผู้รับผิดชอบด้านล่าง",
      en: "No link has been recorded for this form yet. Contact the responsible body below",
    },
  },
  { th: "หน้ารายละเอียดแบบฟอร์ม", en: "Form detail page" },
);
