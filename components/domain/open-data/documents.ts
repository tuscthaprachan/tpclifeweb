import type { DocumentListItem } from "@/components/ui/DocumentList";
import { localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { DocumentSummary } from "@/lib/open-data/read";
import { fillText } from "./fill";
import { documentPath } from "./sections";

const TYPE_LABEL: Record<string, LocaleString> = {
  announcement: UI.odDocTypeAnnouncement,
  regulation: UI.odDocTypeRegulation,
  "university-regulation": UI.odDocTypeUniversityRegulation,
  agenda: UI.odDocTypeAgenda,
  minutes: UI.odDocTypeMinutes,
  report: UI.odDocTypeReport,
  "fund-list": UI.odDocTypeFundList,
  guide: UI.odDocTypeGuide,
  other: UI.odDocTypeOther,
};

export function documentTypeLabel(type: string, locale: Locale): string {
  return (TYPE_LABEL[type] ?? UI.odDocTypeOther)[locale];
}

/** The title in the page language, falling back to the other when one is missing. */
export function documentTitle(doc: Pick<DocumentSummary, "titleTh" | "titleEn">, locale: Locale): string {
  const [first, second] = locale === "th" ? [doc.titleTh, doc.titleEn] : [doc.titleEn, doc.titleTh];
  return first || second;
}

/** The date as the reader should see it. Thai shows the date as printed; English shows the Gregorian date. */
export function documentDate(doc: Pick<DocumentSummary, "dateText" | "dateIso">, locale: Locale): string {
  if (locale === "th") return doc.dateText ?? (doc.dateIso ? formatDate(doc.dateIso, locale) : UI.odDateNotStated.th);
  return doc.dateIso ? formatDate(doc.dateIso, locale) : UI.odDateNotStated.en;
}

export function formatBytes(bytes: number | null, locale: Locale): string {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), locale)} KB`;
  return `${formatNumber(Math.round((bytes / (1024 * 1024)) * 10) / 10, locale)} MB`;
}

export function isPdf(doc: Pick<DocumentSummary, "driveFileName">): boolean {
  return /\.pdf$/i.test(doc.driveFileName.trim());
}

function formatName(doc: Pick<DocumentSummary, "driveFileName">, locale: Locale): string {
  return isPdf(doc) ? UI.odFormatHtmlPdf[locale] : UI.odFormatHtmlSheet[locale];
}

export function documentListItem(doc: DocumentSummary, locale: Locale, byId: ReadonlyMap<string, DocumentSummary>): DocumentListItem {
  const notes: string[] = [UI.odFileNumber[locale].replace("{n}", doc.number)];
  if (doc.scan) notes.push(UI.odScanNote[locale]);
  const replacement = doc.replacedById ? byId.get(doc.replacedById) : undefined;
  if (replacement) notes.push(fillText(UI.odReplacedByNote[locale], { n: replacement.number }));
  return {
    title: documentTitle(doc, locale),
    href: localePath(locale, documentPath(doc.slug)),
    type: documentTypeLabel(doc.type, locale),
    date: doc.dateIso,
    noDateText: doc.dateIso ? undefined : doc.dateText && locale === "th" ? doc.dateText : UI.odDateNotStated[locale],
    format: formatName(doc, locale),
    size: formatBytes(doc.fileBytes, locale),
    pages: doc.pages === null ? undefined : fillText(UI.odPagesCount[locale], { n: formatNumber(doc.pages, locale) }),
    description: notes.join(". "),
  };
}

/** Thai folder name to the label used in the English view. Unknown folders fall back to the Drive name. */
const FOLDER_EN: Record<string, string> = {
  "ประกาศต่าง ๆ": "Announcements",
  "บัญชีรายชื่อสมาชิกสภานักศึกษา": "List of Student Council members",
  "ระเบียบ และข้อบังคับ": "Regulations and rules",
  "ระเบียบวาระการประชุม": "Meeting agendas",
  "ข้อมูลกองทุน": "Fund information",
  "รายงานการประชุม": "Minutes of meetings",
  "รายงาน กมธ. วิสามัญ": "Ad hoc committee reports",
  "อื่น ๆ": "Other",
};

const SUBFOLDER_EN: Record<string, string> = {
  "1. ประกาศแต่งตั้งตราครุฑ": "1. Appointments announced by the university (Garuda seal)",
  "2. ประกาศแต่งตั้งคณะกรรมการประสานงานร่วมสภา": "2. Appointment of the Council Coordination Committee",
  "3. ประกาศแต่งตั้งคณะกรรมาธิการสามัญ & วิสามัญ": "3. Appointment of standing and ad hoc committees",
  "4. ประกาศสภานักศึกษา ท่าพระจันทร์": "4. Student Council announcements",
  "ระเบียบกิจกรรมนักศึกษาฯ": "Student activities regulations",
  "ระเบียบกิจกรรมฯ ท่าพระจันทร์": "Tha Prachan regulations",
  "สมัยสามัญ 2 / 2568 / การประชุมสภานักศึกษาฯ ท่าพระจันทร์ สมัยสามัญ 2 ครั้งที่ 1 / วาระการประชุม":
    "Ordinary Session 2, 2568, Meeting 1: agenda",
  "สมัยสามัญ 2 / 2568 / การประชุมสภานักศึกษาฯ ท่าพระจันทร์ สมัยสามัญ 2 ครั้งที่ 1 / เอกสารประกอบการประชุม / เอกสารประกอบวาระ 3.1":
    "Ordinary Session 2, 2568, Meeting 1: papers for item 3.1",
  "สมัยสามัญ 2 / 2568 / การประชุมสภานักศึกษาฯ ท่าพระจันทร์ สมัยสามัญ 2 ครั้งที่ 1 / เอกสารประกอบการประชุม / เอกสารประกอบวาระ 3.2":
    "Ordinary Session 2, 2568, Meeting 1: papers for item 3.2",
  "สมัยวิสามัญ 1 / 2568": "Extraordinary Session 1, 2568",
  "สมัยวิสามัญ 2 / 2568": "Extraordinary Session 2, 2568",
  "สมัยสามัญ 2 / 2568": "Ordinary Session 2, 2568",
};

export interface DocumentSection {
  key: string;
  /** Null for files that sit directly in the top folder of a group that has no subfolders. */
  heading: string | null;
  docs: DocumentSummary[];
}

export interface DocumentGroup {
  key: string;
  id: string;
  /** The Drive folder number, "1" to "7", or null for an unnumbered folder. */
  number: string | null;
  /** The folder name as it is in Drive, without its number. */
  driveName: string;
  title: string;
  sections: DocumentSection[];
  count: number;
}

function parts(path: string): string[] {
  return path
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitNumber(name: string): { number: string | null; rest: string } {
  const match = /^(\d+)\.\s*(.*)$/.exec(name);
  return match ? { number: match[1] ?? null, rest: match[2] ?? "" } : { number: null, rest: name };
}

const MINUTES_FOLDER = "รายงานการประชุม";

/** Groups the documents as the Drive folder does: one group per top folder, one section per subfolder, in order of first appearance. */
export function groupDocuments(docs: readonly DocumentSummary[], locale: Locale): DocumentGroup[] {
  const groups = new Map<string, { number: string | null; driveName: string; sections: Map<string, DocumentSection>; direct: DocumentSummary[] }>();

  for (const doc of docs) {
    const [top = "", ...below] = parts(doc.driveFolderPath);
    const { number, rest: driveName } = splitNumber(top);
    let group = groups.get(top);
    if (!group) {
      group = { number, driveName, sections: new Map(), direct: [] };
      groups.set(top, group);
    }
    if (below.length === 0) {
      group.direct.push(doc);
      continue;
    }
    const sectionPath = driveName === MINUTES_FOLDER ? below.slice(0, 2) : below;
    const key = sectionPath.join(" / ");
    const section = group.sections.get(key) ?? {
      key,
      heading: locale === "th" ? key : (SUBFOLDER_EN[key] ?? key),
      docs: [],
    };
    section.docs.push(doc);
    group.sections.set(key, section);
  }

  return [...groups.entries()].map(([top, group], index) => {
    const sections = [...group.sections.values()];
    if (group.direct.length > 0) {
      sections.push({
        key: "direct",
        heading: sections.length > 0 ? UI.odFilesInMainFolder[locale] : null,
        docs: group.direct,
      });
    }
    const english = FOLDER_EN[group.driveName];
    const name = locale === "en" && english ? english : group.driveName;
    return {
      key: top,
      id: `folder-${index + 1}`,
      number: group.number,
      driveName: group.driveName,
      title: group.number ? `${group.number}. ${name}` : name,
      sections,
      count: sections.reduce((sum, s) => sum + s.docs.length, 0),
    };
  });
}

/** The Drive folder of a document, as shown in its metadata. */
export function driveFolderLabel(doc: Pick<DocumentSummary, "driveFolderPath">): string {
  return parts(doc.driveFolderPath).join(" / ");
}
