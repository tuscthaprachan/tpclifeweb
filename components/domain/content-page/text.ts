import { editableStrings } from "@/lib/i18n/editable";

export const SECTION_TEXT = editableStrings(
  "page-section",
  {
    listHeading: {
      th: "หัวข้อและบริการ",
      en: "Topics and services",
    },
    staleReviewLabel: {
      th: "ยังไม่ได้ตรวจสอบมานาน",
      en: "Not reviewed recently",
    },
    nothingYet: {
      th: "ยังไม่มีหัวข้อในหมวดนี้",
      en: "There are no topics in this section yet",
    },
  },
  { th: "หน้าหมวดหมู่", en: "Section page" },
);

export const TOPIC_TEXT = editableStrings(
  "page-topic",
  {
    staleReviewLabel: {
      th: "หน้านี้ยังไม่ได้ตรวจสอบมานานกว่าหนึ่งปี",
      en: "This page has not been reviewed in over a year",
    },
    staleReviewBody: {
      th: "เนื้อหาบางส่วนอาจไม่เป็นปัจจุบัน โปรดตรวจสอบกับผู้รับผิดชอบก่อนใช้งาน",
      en: "Some details here may be out of date. Check with the responsible body before relying on them",
    },
    backToSection: {
      th: "ดูทั้งหมดใน {section}",
      en: "See all in {section}",
    },
  },
  { th: "หน้าหัวข้อ", en: "Topic page" },
);
