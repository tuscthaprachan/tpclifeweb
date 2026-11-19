import type { LocaleString } from "@/lib/i18n/config";
import type { HeatLevel, Pm25Level } from "./levels";

/**
 * The advice shown for each level until an editor changes it in the console
 * (Today settings). Drawn from the Department of Health's heat index guidance
 * and the Pollution Control Department's PM2.5 advice.
 */
export const DEFAULT_HEAT_ADVICE: Record<HeatLevel, LocaleString> = {
  normal: { th: "ทำกิจกรรมกลางแจ้งได้ตามปกติ", en: "Outdoor activity is fine" },
  watch: { th: "อาจอ่อนเพลียหากอยู่กลางแดดนาน ดื่มน้ำบ่อย ๆ", en: "Long spells in the sun can tire you out. Drink water often" },
  warning: {
    th: "อาจเป็นตะคริวหรือเพลียแดด ดื่มน้ำบ่อย ๆ และพักในที่ร่ม",
    en: "Heat cramps and heat exhaustion are possible. Drink water often and rest in the shade",
  },
  danger: {
    th: "เสี่ยงเป็นโรคลมแดดหากอยู่กลางแดดนาน เลี่ยงกิจกรรมกลางแจ้งช่วงกลางวัน",
    en: "Heat stroke is likely after long spells outside. Avoid outdoor activity in the middle of the day",
  },
  extremeDanger: { th: "เสี่ยงสูงที่จะเป็นโรคลมแดด อยู่ในอาคารที่เย็น", en: "Heat stroke is very likely. Stay indoors somewhere cool" },
};

export const DEFAULT_PM25_ADVICE: Record<Pm25Level, LocaleString> = {
  veryGood: { th: "อากาศดีมาก เหมาะกับกิจกรรมกลางแจ้ง", en: "Very good for outdoor activity" },
  good: { th: "ทำกิจกรรมกลางแจ้งได้ตามปกติ", en: "Outdoor activity is fine" },
  moderate: { th: "ผู้ที่มีโรคประจำตัวควรสังเกตอาการ เช่น ไอ หายใจลำบาก", en: "If you have a health condition, watch for coughing or shortness of breath" },
  startingToAffect: {
    th: "ลดเวลาทำกิจกรรมกลางแจ้ง สวมหน้ากากกันฝุ่นเมื่ออยู่นอกอาคาร",
    en: "Spend less time outdoors. Wear a dust mask when you are outside",
  },
  affectsHealth: {
    th: "งดกิจกรรมกลางแจ้ง สวมหน้ากากกันฝุ่นเมื่อออกนอกอาคาร หากมีอาการผิดปกติให้พบแพทย์",
    en: "Avoid outdoor activity. Wear a dust mask outside and see a doctor if you feel unwell",
  },
};
