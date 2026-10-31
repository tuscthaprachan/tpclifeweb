import type { OrgKey } from "./labels";

/**
 * Figures the budget summary report (source file 48) prints and the budget lines do not hold:
 * totals, percentages and the page each table is on. They are shown as printed.
 */

export const REPORT_FILE = "48";

export const PRINTED_TOTAL: Readonly<Record<number, { amount: string; page: number }>> = {
  2568: { amount: "1970599.50", page: 16 },
  2569: { amount: "1988223.24", page: 5 },
};

/** The page of the 2569 report that holds the comparison of the two years. */
export const COMPARISON_PAGE = 16;

/** The whole-campus category table. */
export const CATEGORY_PAGE = 6;

export const UNION_SHARE = "58.9";

/** The total printed under each body's project and category tables, and the page they are on. */
export const PRINTED_BODY: Readonly<Partial<Record<OrgKey, { total: string; page: number }>>> = {
  tusc: { total: "9182.00", page: 8 },
  tusu: { total: "1171383.84", page: 9 },
  film: { total: "857.00", page: 10 },
  music: { total: "216619.16", page: 11 },
  dance: { total: "4800.00", page: 12 },
  asa: { total: "313000.00", page: 13 },
  host: { total: "72381.24", page: 14 },
};

/** Percentages printed in the category column of the whole-campus table, by category item as stored. */
export const PRINTED_CATEGORY_SHARE: Readonly<Record<string, string>> = {
  "ค่าตอบแทนปฏิบัติงานในเวลาราชการ": "5.02",
  "ค่าตอบแทนปฏิบัติงานนอกเวลาราชการ": "0.36",
  "ค่าตอบแทนวิทยาการ": "0.58",
  "ค่าตอบแทนผู้ตัดสิน": "11.12",
  "ค่ารถ/การเดินทาง": "7.54",
  "ค่าอาหาร/อาหารว่าง": "6.27",
  "ค่าจ้างเหมาบริการจัดงาน จัดสถานที่ จัดเวที แสง สี เสียง": "38.67",
  "ค่าเช่า/ติดตั้งเต็นท์": "9.34",
  "ค่าเช่าสถานที่/ห้องประชุม": "0.15",
  "ค่าสาธารณูปโภค": "0.79",
  "ค่าจัดทำสื่อสิ่งพิมพ์": "0.13",
  "ค่าสื่อประชาสัมพันธ์": "0.07",
  "ค่าสนับสนุนชุมนุม": "1.38",
  "ค่าจ้างศิลปิน": "3.77",
  "ค่าจัดซื้อวัสดุอุปกรณ์": "13.81",
  "ค่าเช่าวัสดุอุปกรณ์/ครุภัณฑ์": "0.64",
  "ค่าครุภัณฑ์": "0.35",
};

/** The total of the whole-campus category table is printed with this share. */
export const PRINTED_CATEGORY_TOTAL_SHARE = "100";

/** Percentages printed on the Student Union's project pie chart (page 9), by project as stored. The seventh slice has no label. */
export const PRINTED_UNION_PROJECT_SHARE: Readonly<Record<string, string>> = {
  "Passport to the world": "11.5",
  "TPC Festival": "13.3",
  "TPC Games 2025": "29.8",
  "TPC Loykrathong 2025": "14.1",
  "TPC On Screen 2025": "8.8",
  "TPC Open House 2025": "15.4",
};

/** Percentages printed on the 2568 pie chart (page 16). Two bodies carry no label. */
export const PRINTED_SHARE_2568: Readonly<Partial<Record<OrgKey, string>>> = {
  tusu: "63.3",
  asa: "17.3",
  music: "14.3",
  host: "2.5",
  fc: "0.8",
  tusc: "0.5",
  doc: "0.4",
  tedc: "0.3",
  ec: "0.2",
};
