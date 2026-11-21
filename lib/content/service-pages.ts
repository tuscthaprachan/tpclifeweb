/**
 * The wording on each service's start page that staff can change in the
 * console (Website > Service pages). Every field has a built-in default, the
 * text the site shows until someone edits it and again if they clear it.
 *
 * A `list` field is shown as a bulleted list: one item per line in the
 * console, so staff can add or remove items. Placeholders in braces, such as
 * {loan}, are filled in by the page and must stay in any edited text.
 *
 * Shared by the console form, its validation and the public pages, so it holds
 * no server-only imports.
 */

import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export interface ServiceTextField {
  /** The console label for the field. */
  label: LocaleString;
  /** The text the site shows when the field is not edited. */
  fallback: LocaleString;
  /** Shown as a bulleted list, one item per line. */
  list?: boolean;
  max: number;
}

export interface ServicePageDef {
  /** Public path of the page, for the console's "view page" link. */
  path: string;
  name: LocaleString;
  fields: Record<string, ServiceTextField>;
}

const lines = (...items: LocaleString[]): LocaleString => ({
  th: items.map((i) => i.th).join("\n"),
  en: items.map((i) => i.en).join("\n"),
});

const text = (label: LocaleString, fallback: LocaleString, max = 600): ServiceTextField => ({ label, fallback, max });
const list = (label: LocaleString, ...items: LocaleString[]): ServiceTextField => ({ label, fallback: lines(...items), list: true, max: 2000 });

const L = {
  intro: { th: "ย่อหน้าแนะนำ", en: "Introduction" },
  needHeading: { th: "หัวข้อ \"สิ่งที่ต้องเตรียม\"", en: "\"You will need\" heading" },
  needList: { th: "รายการสิ่งที่ต้องเตรียม", en: "What you will need" },
  unavailable: { th: "ข้อความเมื่อบริการปิดชั่วคราว", en: "Message when the service is unavailable" },
} satisfies Record<string, LocaleString>;

/* The Report page's text, which used to be hard-coded in its page file. */
const REPORT_INTRO: LocaleString = {
  th: "เลือกช่องทางที่ตรงกับเรื่องที่ต้องการแจ้ง มีสามช่องทาง แยกตามประเภทของเรื่อง",
  en: "Choose the option that matches what you need to report. There are three, depending on the kind of problem",
};
const REPORT_ISSUE_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อมีปัญหาเรื่องรายวิชา คณะ หรือมหาวิทยาลัย หรือต้องการร้องเรียน อมธ. และสภานักศึกษา หากมีใครตกอยู่ในอันตราย ให้โทร 191 หรือ 1669",
  en: "Use this for a problem with a course, your faculty or the university, or to complain about TUSU or TUSC. If anyone is in danger, call 191 or 1669.",
};
const REPORT_FACILITY_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อพบปัญหาสภาพแวดล้อมหรือสิ่งอำนวยความสะดวกในมหาวิทยาลัย เช่น ไฟดับ น้ำรั่ว หรือทางเดินชำรุด",
  en: "Use this for a fault with campus facilities or the physical environment, such as broken lighting, a leak, or a damaged walkway",
};
const REPORT_WELLBEING_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อมีเรื่องส่วนตัว ความเครียด หรือปัญหาสุขภาพใจที่กระทบกับตัวคุณเอง",
  en: "Use this for a personal difficulty, stress, or a mental health concern that affects you specifically",
};

export const SERVICE_PAGES = {
  borrow: {
    path: "/borrow",
    name: UI.brServiceName,
    fields: {
      intro: text(L.intro, UI.brIntro),
      canBorrowHeading: text({ th: "หัวข้อรายการอุปกรณ์", en: "Equipment list heading" }, UI.brCanBorrow, 120),
      needHeading: text(L.needHeading, UI.brYouWillNeed, 120),
      need: list(L.needList, UI.brNeed1, UI.brNeed2, UI.brNeed3, UI.brNeed4),
      rulesNote: text({ th: "หมายเหตุเรื่องระยะเวลายืม", en: "Loan rules note" }, UI.brRulesNote),
      unavailable: text(L.unavailable, UI.brUnavailable),
    },
  },
  complaints: {
    path: "/complaints",
    name: UI.cpServiceName,
    fields: {
      intro: text(L.intro, UI.cpIntro),
      levelsHeading: text({ th: "หัวข้อระดับของเรื่อง", en: "Levels heading" }, UI.cpLevelsHeading, 120),
      levelsBody: text({ th: "คำอธิบายระดับของเรื่อง", en: "Levels explanation" }, UI.cpLevelsBody),
      levels: list({ th: "รายการระดับของเรื่อง", en: "Levels" }, UI.cpLevelsCourse, UI.cpLevelsFaculty, UI.cpLevelsUniversity),
      chooseHeading: text({ th: "หัวข้อการระบุตัวตน", en: "Identity choice heading" }, UI.cpYouChoose, 120),
      chooseBody: text({ th: "คำอธิบายการระบุตัวตน", en: "Identity choice explanation" }, UI.cpYouChooseBody),
      choose: list({ th: "รายการวิธีระบุตัวตน", en: "Identity choices" }, UI.cpYouChooseNamed, UI.cpYouChoosePseudonymous, UI.cpYouChooseAnonymous),
      needHeading: text(L.needHeading, UI.cpYouWillNeed, 120),
      need: list(L.needList, UI.cpNeed1, UI.cpNeed2, UI.cpNeed3),
      sensitiveNote: text({ th: "หมายเหตุเรื่องที่ละเอียดอ่อน", en: "Sensitive matters note" }, UI.cpSensitiveNote),
      unavailable: text(L.unavailable, UI.cpUnavailable),
    },
  },
  lostReport: {
    path: "/lost-and-found/report",
    name: UI.reportLostItem,
    fields: {
      intro: text(L.intro, UI.lfpLostIntro),
      need: list(L.needList, UI.lfpLostNeed1, UI.lfpLostNeed2, UI.lfpLostNeed3, UI.lfpLostNeed4),
    },
  },
  foundReport: {
    path: "/lost-and-found/found",
    name: UI.reportFoundItem,
    fields: {
      intro: text(L.intro, UI.lfpFoundIntro),
      deskNote: text({ th: "หมายเหตุเรื่องการนำส่งที่เคาน์เตอร์", en: "Desk hand-in note" }, UI.lfpFoundDeskNote),
      need: list(L.needList, UI.lfpFoundNeed1, UI.lfpFoundNeed2, UI.lfpFoundNeed3, UI.lfpFoundNeed4),
    },
  },
  report: {
    path: "/report",
    name: UI.report,
    fields: {
      intro: text(L.intro, REPORT_INTRO),
      issueUseWhen: text({ th: "ช่องทางแจ้งปัญหา: ใช้เมื่อใด", en: "Issue reporting: when to use it" }, REPORT_ISSUE_USE_WHEN),
      issueLink: text({ th: "ช่องทางแจ้งปัญหา: ข้อความลิงก์", en: "Issue reporting: link text" }, { th: "เริ่มแจ้งปัญหา", en: "Report an issue" }, 120),
      facilityUseWhen: text({ th: "Traffy Fondue: ใช้เมื่อใด", en: "Traffy Fondue: when to use it" }, REPORT_FACILITY_USE_WHEN),
      facilityLink: text({ th: "Traffy Fondue: ข้อความลิงก์", en: "Traffy Fondue: link text" }, { th: "ไปที่ Traffy Fondue เพื่อแจ้งปัญหา", en: "Go to Traffy Fondue to report a problem" }, 120),
      wellbeingHeading: text({ th: "ความเป็นอยู่: หัวข้อ", en: "Wellbeing: heading" }, { th: "ความเป็นอยู่และสุขภาพใจ", en: "Your own wellbeing" }, 120),
      wellbeingUseWhen: text({ th: "ความเป็นอยู่: ใช้เมื่อใด", en: "Wellbeing: when to use it" }, REPORT_WELLBEING_USE_WHEN),
    },
  },
} as const satisfies Record<string, ServicePageDef>;

export type ServicePageKey = keyof typeof SERVICE_PAGES;
export const SERVICE_PAGE_KEYS = Object.keys(SERVICE_PAGES) as ServicePageKey[];

/** The stored key for one field: `<page>.<field>`. */
export const serviceTextKey = (page: string, field: string) => `${page}.${field}`;

/** The placeholders, such as {loan}, a text uses. */
export function placeholders(value: string): string[] {
  return [...new Set(value.match(/\{[a-z]+\}/gi) ?? [])].sort();
}

/** The items of a list field: one per non-empty line. */
export function listItems(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export type ServicePageText<P extends ServicePageKey> = Record<keyof (typeof SERVICE_PAGES)[P]["fields"], LocaleString>;

/** Each field's wording: the stored override for a language when there is one, else the default. */
export function mergeServiceText<P extends ServicePageKey>(page: P, stored: Record<string, { th?: string; en?: string }>): ServicePageText<P> {
  const fields: Record<string, ServiceTextField> = SERVICE_PAGES[page].fields;
  const out: Record<string, LocaleString> = {};
  for (const [field, def] of Object.entries(fields)) {
    const value = stored[serviceTextKey(page, field)];
    out[field] = { th: value?.th?.trim() || def.fallback.th, en: value?.en?.trim() || def.fallback.en };
  }
  return out as ServicePageText<P>;
}
