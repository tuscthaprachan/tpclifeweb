import type { HomeTask } from "./types";

export const MAX_HOME_TASKS = 8;

export const DEFAULT_HOME_TASKS: readonly HomeTask[] = [
  {
    label: { th: "ค้นหาแบบฟอร์ม", en: "Find a form" },
    description: { th: "ดูว่าต้องเตรียมอะไร และต้องเข้าสู่ระบบหรือไม่", en: "See what you need and whether you have to sign in" },
    path: "/forms",
  },
  {
    label: { th: "แจ้งของหายหรือเก็บของได้", en: "Report lost or found property" },
    description: { th: "ติดตามสถานะได้ด้วยลิงก์ส่วนตัว", en: "Track it with a private link" },
    path: "/lost-and-found",
  },
  {
    label: { th: "แจ้งปัญหา", en: "Report an issue" },
    description: { th: "เรื่องรายวิชา คณะ หรือมหาวิทยาลัย", en: "A course, your faculty or the university" },
    path: "/complaints",
  },
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
