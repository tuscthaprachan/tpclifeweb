import { editableStrings } from "@/lib/i18n/editable";

/** The standard acknowledgement written to the public timeline of a complaint. */
export const COMPLAINT_TEXT = editableStrings(
  "lib-complaints",
  {
    acknowledgement: {
      th: "เจ้าหน้าที่ได้รับเรื่องแล้วและกำลังดำเนินการ เราตั้งเป้าแจ้งผลภายในวันที่ {date}",
      en: "A member of staff has seen your complaint and is looking after it. We aim to give you an answer by {date}.",
    },
  },
  { th: "ข้อร้องเรียน: ข้อความรับเรื่อง", en: "Complaints: acknowledgement" },
);
