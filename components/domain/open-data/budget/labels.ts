import type { Locale } from "@/lib/i18n/config";

export type OrgKey = "tusc" | "tusu" | "film" | "music" | "dance" | "asa" | "host" | "sad" | "ec" | "doc" | "fc" | "tedc";

export interface OrgDef {
  key: OrgKey;
  en: string;
  /** Every spelling of the organisation's name in the budget lines. */
  names: readonly string[];
}

export const ORGS: readonly OrgDef[] = [
  { key: "tusu", en: "Student Union (TUSU)", names: ["อมธ.", "อมธ.ทพจ.", "องค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ (อมธ.ทพจ.)"] },
  { key: "asa", en: "ASA TPC volunteer club", names: ["ชุมนุมอาสาท่าพระจันทร์ (ASA TPC)", "ชุมนุมอาสาท่าพระจันทร์ฯ (ASA TPC)"] },
  { key: "music", en: "TPC MUSIC club", names: ["ชุมนุม TPC MUSIC"] },
  { key: "sad", en: "Student Affairs Division", names: ["กองกิจการนักศึกษา"] },
  { key: "host", en: "TU HOST club", names: ["ชุมนุม TU HOST", "ชุมนุมสื่อสร้างสรรค์ (TU HOST)"] },
  { key: "fc", en: "TU TPC FC football and futsal independent group", names: ["กลุ่มอิสระฟุตบอลและฟุตซอลนานาชาติแห่งมหาวิทยาลัยธรรมศาสตร์ (TU TPC FC)"] },
  { key: "tusc", en: "Student Council (TUSC)", names: ["สภาฯ", "สภาฯ ทพจ.", "สภานักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์"] },
  { key: "dance", en: "TPC DANCE club", names: ["ชุมนุม TPC DANCE"] },
  { key: "doc", en: "TU DOC documentary studies independent group", names: ["กลุ่มอิสระสารคดีศึกษาแห่งมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ (TU DOC)"] },
  { key: "tedc", en: "TEDC English public speaking club", names: ["ชุมนุมปาฐกถาภาษาอังกฤษ (TEDC)"] },
  { key: "ec", en: "Election Commission (กกต.)", names: ["กกต."] },
  { key: "film", en: "TPC Film Club (independent group)", names: ["กลุ่มอิสระ TPC Film Club"] },
];

const BY_NAME = new Map(ORGS.flatMap((org) => org.names.map((name) => [name, org] as const)));
const BY_KEY = new Map(ORGS.map((org) => [org.key, org]));

export function orgByName(name: string): OrgDef | null {
  return BY_NAME.get(name) ?? null;
}

export function orgByKey(key: OrgKey): OrgDef {
  const org = BY_KEY.get(key);
  if (!org) throw new Error(`Unknown organisation ${key}`);
  return org;
}

/** The organisation in the page language: English where the site has a name for it, otherwise as stored. */
export function orgLabel(org: OrgDef | null, stored: string, locale: Locale): string {
  return locale === "en" && org ? org.en : stored;
}

const TYPE_EN: Record<string, string> = {
  "สภา": "Council",
  "อมธ.": "Student Union (TUSU)",
  "ชุมนุม": "Club",
  "กลุ่มอิสระ": "Independent group",
  "กองกิจการนักศึกษา": "University division",
  "รวมทุกองค์กร": "All organisations together",
};

export function organisationTypeLabel(stored: string, locale: Locale): string {
  return locale === "en" ? (TYPE_EN[stored] ?? stored) : stored;
}

const GROUP_EN: Record<string, string> = {
  "ค่าตอบแทน": "Compensation",
  "ค่าใช้สอย": "Running costs",
  "ค่าครุภัณฑ์": "Durable equipment",
};

const ITEM_EN: Record<string, string> = {
  "ค่าตอบแทนปฏิบัติงานในเวลาราชการ": "Pay for work in official hours",
  "ค่าตอบแทนปฏิบัติงานนอกเวลาราชการ": "Pay for work outside official hours",
  "ค่าตอบแทนเจ้าหน้าที่ในการปฏิบัติงานนอกเวลา": "Pay for staff working outside hours",
  "ค่าตอบแทนวิทยากร": "Speaker fees",
  "ค่าตอบแทนวิทยาการ": "Speaker fees",
  "ค่าตอบแทนผู้ตัดสิน": "Referee and judge fees",
  "ค่ารถ/การเดินทาง": "Vehicles and travel",
  "ค่าอาหาร/อาหารว่าง": "Food and refreshments",
  "ค่าจ้างเหมาบริการจัดงาน จัดสถานที่ จัดเวที แสง สี และเสียง": "Event services contract (venue, stage, lighting, sound)",
  "ค่าจ้างเหมาบริการจัดงาน จัดสถานที่ จัดเวที แสง สี เสียง": "Event services contract (venue, stage, lighting, sound)",
  "ค่าเช่า/ติดตั้งเต็นท์": "Tent hire and installation",
  "ค่าเช่าสถานที่/ห้องประชุม": "Venue and meeting room hire",
  "ค่าสาธารณูปโภค": "Utilities",
  "ค่าจัดทำสื่อสิ่งพิมพ์": "Printed materials",
  "ค่าสื่อสิ่งพิมพ์": "Printed materials",
  "ค่าจัดทำสิ่งพิมพ์": "Printed materials",
  "ค่าสื่อประชาสัมพันธ์": "Publicity materials",
  "ค่าประชาสัมพันธ์": "Publicity",
  "ค่าจัดสื่อสิ่งพิมพ์/สื่อประชาสัมพันธ์": "Printed and publicity materials",
  "ค่าสนับสนุนชุมนุม": "Support for clubs",
  "ค่าจ้างศิลปิน": "Performer fees",
  "ค่าจัดซื้อวัสดุอุปกรณ์": "Purchase of materials and equipment",
  "ค่าเช่าวัสดุอุปกรณ์/ครุภัณฑ์": "Hire of materials and equipment",
  "ค่าเช่าวัสดุ/ครุภัณฑ์": "Hire of materials and equipment",
  "ค่าครุภัณฑ์": "Durable equipment",
  "ค่าจ้างติดตั้งเวที": "Stage installation",
};

export interface CategoryParts {
  group: string;
  item: string;
}

/** Splits a stored category ("group > item") into its group and item. */
export function categoryParts(category: string): CategoryParts {
  const at = category.indexOf(" > ");
  return at < 0 ? { group: "", item: category } : { group: category.slice(0, at), item: category.slice(at + 3) };
}

export function groupLabel(group: string, locale: Locale): string {
  return locale === "en" ? (GROUP_EN[group] ?? group) : group;
}

export function itemLabel(item: string, locale: Locale): string {
  return locale === "en" ? (ITEM_EN[item] ?? item) : item;
}

/** True when the language of `text` differs from the page, so it needs a `lang` attribute. */
export function needsThaiLang(text: string, locale: Locale): boolean {
  return locale === "en" && /[฀-๿]/.test(text);
}
