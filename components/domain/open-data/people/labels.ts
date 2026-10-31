import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { BodyRow } from "@/lib/open-data/read";
import { EXECUTIVE_SLUG, printedOrNull } from "./model";

const FACULTY_EN: Record<string, string> = {
  "วิทยาลัยสหวิทยาการ": "College of Interdisciplinary Studies",
  "คณะรัฐศาสตร์": "Faculty of Political Science",
  "คณะศิลปศาสตร์": "Faculty of Liberal Arts",
  "วิทยาลัยนวัตกรรม": "College of Innovation",
  "คณะนิติศาสตร์": "Faculty of Law",
  "คณะพาณิชยศาสตร์และการบัญชี": "Faculty of Commerce and Accountancy",
  "วิทยาลัยนานาชาติปรีดี พนมยงค์": "Pridi Banomyong International College",
};

const TYPE_TH: Record<string, string> = {
  "Joint coordinating committee": "คณะกรรมการประสานงานร่วม",
  "Standing committee": "คณะกรรมาธิการสามัญ",
  "Ad hoc committee": "คณะกรรมาธิการวิสามัญ",
  "Sub-committee": "อนุกรรมาธิการ",
  Office: "สำนัก",
  "Assistant secretaries-general": "ผู้ช่วยเลขาธิการ",
};

const ROLE_EN: Record<string, string> = {
  "กรรมาธิการ": "Member",
  "กรรมการ": "Member",
  "ประธานคณะกรรมาธิการ": "Chair",
  "ประธานคณะกรรมการ": "Chair",
  "อนุกรรมาธิการ (ไม่ระบุตำแหน่ง)": "Sub-committee member (post not stated)",
  "เลขานุการและกรรมาธิการ": "Secretary and member",
  "กรรมการและเลขานุการ": "Member and secretary",
  "รองประธาน": "Vice-chair",
  "รองประธาน คนที่ 1": "1st Vice-chair",
  "รองประธาน คนที่ 2": "2nd Vice-chair",
  "ผู้ช่วยเลขาธิการ": "Assistant Secretary-General",
  "ผู้ช่วยเลขาธิการ (ตามที่ระบุในรายงานการประชุม ไม่มีประกาศแต่งตั้งในโฟลเดอร์)":
    "Assistant Secretary-General (as named in the minutes, no appointing announcement in the folder)",
  "ผู้ช่วยเลขาธิการ (ลงนามรายงานการประชุม 19 มีนาคม 2569)": "Assistant Secretary-General (signed the minutes of 19 March 2026)",
  "เลขาธิการสภานักศึกษา": "Secretary-General",
  "รองเลขาธิการ คนที่ 1": "1st Deputy Secretary-General",
  "รองเลขาธิการ คนที่ 2": "2nd Deputy Secretary-General",
  "รองเลขาธิการ คนที่ 1 รักษาการแทนเลขาธิการ (ตามที่ลงนามในรายงานการประชุม)":
    "1st Deputy Secretary-General acting for the Secretary-General (as signed on the minutes)",
  "ประธานคณะกรรมาธิการการเมืองและส่งเสริมประชาธิปไตย (สภารับรอง)": "Chair, Politics and Democracy Promotion Committee (endorsed by the council)",
  "ประธานสภานักศึกษา ท่าพระจันทร์": "President of the Student Council, Tha Prachan",
  "ประธานคณะกรรมาธิการพิทักษ์สิทธิ สวัสดิการ และความเท่าเทียม (สมาชิกคณะกรรมการบริหาร)":
    "Chair, Rights Protection, Welfare and Equality Committee (executive committee member)",
  "ประธานคณะกรรมาธิการติดตามและตรวจสอบงบประมาณ (สมาชิกคณะกรรมการบริหาร)":
    "Chair, Budget Monitoring and Audit Committee (executive committee member)",
  "ประธานคณะกรรมาธิการกิจการสภาและองค์กรสัมพันธ์ (สมาชิกคณะกรรมการบริหาร)":
    "Chair, Council Affairs and Organisational Relations Committee (executive committee member)",
  "ประธานคณะกรรมาธิการการเมืองและส่งเสริมประชาธิปไตย (สมาชิกคณะกรรมการบริหาร) ถูกถอดถอนโดยมติสภา":
    "Chair, Politics and Democracy Promotion Committee (executive committee member), removed by council resolution",
  "ผู้ช่วยประธานสภานักศึกษา ฝ่ายประชาสัมพันธ์": "Assistant to the President, public relations",
  "ที่ปรึกษาประธานสภานักศึกษา": "Adviser to the President",
  "สมาชิกสภานักศึกษา": "Council member",
};

const PARTY_TH: Record<string, string> = {
  "Renew TPC": "รีนิว ทีพีซี",
  ReLife: "รีไลฟ์",
};

const EXECUTIVE_VICE: Record<string, string> = {
  "รองประธาน": "Vice-President",
  "รองประธาน คนที่ 1": "1st Vice-President",
  "รองประธาน คนที่ 2": "2nd Vice-President",
};

export interface Labelled {
  text: string;
  /** True where the text is Thai because no English wording is held, so it is marked lang="th". */
  thai: boolean;
}

/** A post as printed (Thai), or its English wording in the English view where one is held. */
export function roleLabel(roleTh: string, locale: Locale, bodySlug?: string): Labelled {
  if (locale === "th") return { text: roleTh, thai: true };
  const executive = bodySlug === EXECUTIVE_SLUG || bodySlug === "executive-committee-all-campuses";
  const en = (executive ? EXECUTIVE_VICE[roleTh] : undefined) ?? ROLE_EN[roleTh];
  return en ? { text: en, thai: false } : { text: roleTh, thai: true };
}

export function facultyLabel(faculty: string | null, locale: Locale): Labelled | null {
  const printed = printedOrNull(faculty);
  if (printed === null) return null;
  const en = FACULTY_EN[printed];
  return locale === "en" && en ? { text: en, thai: false } : { text: printed, thai: true };
}

/** A party as the dataset prints it, with its Thai name in the Thai view where one is held. */
export function partyLabel(party: string | null, locale: Locale): Labelled | null {
  const printed = printedOrNull(party);
  if (printed === null) return null;
  const th = PARTY_TH[printed];
  return locale === "th" && th ? { text: th, thai: true } : { text: printed, thai: !th && locale === "th" };
}

/** The type of a body: as the dataset prints it in English, in Thai where known. */
export function bodyTypeLabel(body: Pick<BodyRow, "committeeType" | "kind">, locale: Locale): string {
  const printed = printedOrNull(body.committeeType);
  if (printed) return locale === "th" ? (TYPE_TH[printed] ?? printed) : printed;
  return body.kind === "office" ? UI.odBodyOffice[locale] : UI.odBodyCommittee[locale];
}

export function bodyName(body: Pick<BodyRow, "nameTh" | "nameEn">, locale: Locale): Labelled {
  if (locale === "en" && body.nameEn) return { text: body.nameEn, thai: false };
  return { text: body.nameTh, thai: true };
}
