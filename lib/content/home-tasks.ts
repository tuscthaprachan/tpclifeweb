import type { HomeTask } from "./types";

export const MAX_HOME_TASKS = 8;

/** The default Popular tiles when there is no site settings row yet. The console owns them after that. */
export const SERVICE_HOME_TASKS: readonly HomeTask[] = [
  {
    label: { th: "แจ้งปัญหา", en: "Report an issue" },
    description: { th: "เรื่องรายวิชา คณะ หรือมหาวิทยาลัย", en: "A course, your faculty or the university" },
    path: "/complaints",
  },
  {
    label: { th: "ยืมอุปกรณ์", en: "Borrow equipment" },
    description: { th: "อุปกรณ์กีฬา วิทยุสื่อสาร ชุดปฐมพยาบาล", en: "Sports kit, radios and first aid kits" },
    path: "/borrow",
  },
  {
    label: { th: "แจ้งของหายหรือเก็บของได้", en: "Report lost or found property" },
    description: { th: "ติดตามสถานะได้ด้วยลิงก์ส่วนตัว", en: "Track it with a private link" },
    path: "/lost-and-found",
  },
];

export const HIGHLIGHTED_HOME_TASK_PATH = "/complaints";

export const DEFAULT_HOME_TASKS: readonly HomeTask[] = [
  ...SERVICE_HOME_TASKS,
  {
    label: { th: "สวัสดิการและสุขภาพ", en: "Welfare and health" },
    description: { th: "ทุน ประกันอุบัติเหตุ สุขภาพจิต", en: "Grants, accident insurance, mental health" },
    path: "/welfare",
  },
  {
    label: { th: "กินอะไรดี", en: "What to eat" },
    description: { th: "ร้านในโรงอาหาร พร้อมราคา", en: "Canteen stalls with prices" },
    path: "/eat",
  },
  {
    label: { th: "ติดต่อหน่วยงาน", en: "Find a contact" },
    description: { th: "เบอร์โทรและอีเมลของหน่วยงานในวิทยาเขต", en: "Phone numbers and emails for campus offices" },
    path: "/directory",
  },
];
