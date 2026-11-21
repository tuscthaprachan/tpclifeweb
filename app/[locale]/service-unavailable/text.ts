import { editableStrings } from "@/lib/i18n/editable";

export const SERVICE_UNAVAILABLE_TEXT = editableStrings(
  "page-service-unavailable",
  {
    serviceUnavailableBody: {
      th: "ระบบ #ท้ายท่าพระจันทร์ ไม่พร้อมให้บริการชั่วคราว อาจเกิดจากการปรับปรุงระบบหรือปัญหาทางเทคนิค ลองใหม่อีกครั้งในอีกสักครู่",
      en: "#trytpc is temporarily unavailable, most likely due to maintenance or a technical problem. Please try again shortly.",
    },
  },
  { th: "หน้าบริการไม่พร้อมใช้งาน", en: "Service unavailable page" },
);
