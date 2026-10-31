import { fillText } from "@/components/domain/open-data/fill";
import { OPEN_DATA_PATH, TUSC_SECTIONS, documentPath } from "@/components/domain/open-data/sections";
import type { SearchRecord } from "@/lib/content/types";
import { UI } from "@/lib/i18n/strings";
import type { DocumentSummary } from "@/lib/open-data/read";

const WEIGHT_SECTION = 45;
const WEIGHT_DOCUMENT = 35;

const path = (route: string) => ({ th: `/th${route}`, en: `/en${route}` });
const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" ");

interface Counts {
  documents: number;
  meetings: number;
  funds: number;
}

/** Search records for the open data landing page and the TUSC section pages. */
export function openDataSectionRecords(counts: Counts): SearchRecord[] {
  const landing: SearchRecord = {
    id: "open-data",
    type: "openDataPage",
    path: path(OPEN_DATA_PATH),
    title: UI.odOpenData,
    summary: UI.odLandingSummary,
    haystack: join(UI.odOpenData.th, UI.odOpenData.en, UI.odLandingSummary.th, UI.odLandingSummary.en),
    weight: WEIGHT_SECTION,
  };
  const n = { documents: counts.documents, meetings: counts.meetings, funds: counts.funds };
  const sections = TUSC_SECTIONS.map((section): SearchRecord => {
    const values = { n: n[section.key as keyof Counts] ?? "" };
    const description = section.description;
    const summary = description
      ? { th: fillText(description.th, values), en: fillText(description.en, values) }
      : UI.odTuscSummary;
    return {
      id: `open-data-tusc-${section.key}`,
      type: "openDataPage",
      path: path(section.path),
      title: section.key === "overview" ? UI.odTuscFull : { th: `${section.label.th} | ${UI.odTuscShort.th}`, en: `${section.label.en} | ${UI.odTuscShort.en}` },
      summary,
      haystack: join(section.label.th, section.label.en, summary.th, summary.en, UI.odTuscFull.th, UI.odTuscFull.en, UI.odOpenData.th, UI.odOpenData.en),
      weight: WEIGHT_SECTION,
    };
  });
  return [landing, ...sections];
}

/** One search record per open data document page. The haystack holds the facts that identify the document, not its transcript. */
export function openDataDocumentRecords(documents: readonly DocumentSummary[]): SearchRecord[] {
  return documents.map((doc) => ({
    id: doc.id,
    type: "openDataDocument",
    path: path(documentPath(doc.slug)),
    title: { th: doc.titleTh || doc.titleEn, en: doc.titleEn || doc.titleTh },
    summary: { th: doc.issuerTh ?? "", en: doc.issuerEn ?? "" },
    haystack: join(doc.titleTh, doc.titleEn, doc.issuerTh, doc.issuerEn, doc.reference, doc.dateText, doc.dateIso, doc.number),
    weight: WEIGHT_DOCUMENT,
  }));
}
