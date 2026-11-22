import { editableStrings } from "@/lib/i18n/editable";

export const GUIDE_DETAIL_TEXT = editableStrings(
  "page-guide-detail",
  {
    staleReviewLabel: {
      th: "หน้านี้ยังไม่ได้ตรวจสอบมานานกว่าหนึ่งปี",
      en: "This page has not been reviewed in over a year",
    },
    staleReviewBody: {
      th: "เนื้อหาบางส่วนอาจไม่เป็นปัจจุบัน โปรดตรวจสอบกับผู้รับผิดชอบก่อนใช้งาน",
      en: "Some details here may be out of date. Check with the responsible body before relying on them",
    },
    allTopics: {
      th: "ดูหัวข้อในคู่มือทั้งหมด",
      en: "See all guide topics",
    },
  },
  { th: "หน้าคู่มือ", en: "Guide page" },
);
