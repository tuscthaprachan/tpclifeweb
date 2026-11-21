import { editableStrings } from "@/lib/i18n/editable";

export const POLICY_DETAIL_TEXT = editableStrings(
  "page-policy-detail",
  {
    policyAreaLabel: {
      th: "ประเด็นนโยบาย",
      en: "Policy area",
    },
    startedLabel: {
      th: "เริ่มดำเนินการ",
      en: "Started",
    },
    targetDateLabel: {
      th: "กำหนดเป้าหมาย",
      en: "Target date",
    },
    completedLabel: {
      th: "ดำเนินการเสร็จสิ้น",
      en: "Completed",
    },
  },
  { th: "หน้ารายละเอียดนโยบาย", en: "Policy detail page" },
);
