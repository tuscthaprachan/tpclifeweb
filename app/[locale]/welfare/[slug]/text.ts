import { editableStrings } from "@/lib/i18n/editable";

export const WELFARE_DETAIL_TEXT = editableStrings(
  "page-welfare-detail",
  {
    staleReviewLabel: {
      th: "หน้านี้ยังไม่ได้ตรวจสอบมานานกว่าหนึ่งปี",
      en: "This page has not been reviewed in over a year",
    },
    staleReviewBody: {
      th: "เนื้อหาบางส่วนอาจไม่เป็นปัจจุบัน โปรดตรวจสอบกับผู้รับผิดชอบก่อนใช้งาน",
      en: "Some details here may be out of date. Check with the responsible body before relying on them",
    },
  },
  { th: "หน้ารายละเอียดสวัสดิการ", en: "Welfare detail page" },
);
