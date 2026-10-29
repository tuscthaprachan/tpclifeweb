import type { HomeTask } from "./types";

export const MAX_HOME_TASKS = 8;

/**
 * The services a student does something in lead the Popular tiles, in this
 * order, whatever order the stored list is in: reporting an issue (drawn as
 * the highlighted tile), borrowing equipment, lost and found. An editor's own
 * wording for one is kept; a missing one is added with the wording below.
 * The forms index is no longer a tile, because these services replace the
 * Google Forms it pointed to; it stays reachable from search and /services.
 */
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

export const RETIRED_HOME_TASK_PATHS: readonly string[] = ["/forms"];

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

/** Services first, then the stored tiles in their own order without retired ones, at most MAX_HOME_TASKS. */
export function servicesFirst(tasks: readonly HomeTask[]): HomeTask[] {
  const servicePaths = SERVICE_HOME_TASKS.map((t) => t.path);
  const services = SERVICE_HOME_TASKS.map((s) => tasks.find((t) => t.path === s.path) ?? s);
  const rest = tasks.filter((t) => !servicePaths.includes(t.path) && !RETIRED_HOME_TASK_PATHS.includes(t.path));
  return [...services, ...rest].slice(0, MAX_HOME_TASKS);
}
