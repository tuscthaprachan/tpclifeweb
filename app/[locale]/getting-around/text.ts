import { editableStrings } from "@/lib/i18n/editable";

export const GETTING_AROUND_TEXT = editableStrings(
  "page-getting-around",
  {
    headingsShuttle: {
      th: "รถรับส่งธรรมศาสตร์ท่าพระจันทร์",
      en: "TPC shuttle bus",
    },
    headingsMrt: {
      th: "รถไฟฟ้า MRT",
      en: "MRT",
    },
    headingsBoat: {
      th: "เรือด่วนเจ้าพระยา",
      en: "Chao Phraya express boat",
    },
    headingsVehicleAccess: {
      th: "หลักเกณฑ์รถเข้า-ออกและค่าปรับ",
      en: "Vehicle access rules and fines",
    },
    noTimetableNote: {
      th: "ยังไม่มีการเผยแพร่ตารางเวลาสำหรับเส้นทางนี้ ทีมงานกำลังตรวจสอบตารางเวลาที่ประกาศไว้",
      en: "A timetable for this route has not been published yet. The published schedule is being confirmed",
    },
  },
  { th: "หน้าการเดินทางในมหาวิทยาลัย", en: "Getting around page" },
);
