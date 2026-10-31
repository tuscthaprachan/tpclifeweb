import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export const OPEN_DATA_PATH = "/about/open-data";
export const TUSC_PATH = `${OPEN_DATA_PATH}/tusc`;
export const TUSU_PATH = `${OPEN_DATA_PATH}/tusu`;

export const TUSC_SECTION_KEYS = [
  "overview",
  "people",
  "committees",
  "meetings",
  "decisions",
  "rules",
  "budget",
  "reports",
  "funds",
  "documents",
  "data",
] as const;
export type TuscSectionKey = (typeof TUSC_SECTION_KEYS)[number];

export interface TuscSection {
  key: TuscSectionKey;
  /** Locale-free path. */
  path: string;
  label: LocaleString;
  /** One line saying what the section holds; may contain `{n}`. Absent for the overview. */
  description?: LocaleString;
}

export const TUSC_SECTIONS: readonly TuscSection[] = [
  { key: "overview", path: TUSC_PATH, label: UI.odNavOverview },
  { key: "people", path: `${TUSC_PATH}/people`, label: UI.odNavPeople, description: UI.odNavPeopleDesc },
  { key: "committees", path: `${TUSC_PATH}/committees`, label: UI.odNavCommittees, description: UI.odNavCommitteesDesc },
  { key: "meetings", path: `${TUSC_PATH}/meetings`, label: UI.odNavMeetings, description: UI.odNavMeetingsDesc },
  { key: "decisions", path: `${TUSC_PATH}/decisions`, label: UI.odNavDecisions, description: UI.odNavDecisionsDesc },
  { key: "rules", path: `${TUSC_PATH}/rules`, label: UI.odNavRules, description: UI.odNavRulesDesc },
  { key: "budget", path: `${TUSC_PATH}/budget`, label: UI.odNavBudget, description: UI.odNavBudgetDesc },
  { key: "reports", path: `${TUSC_PATH}/reports`, label: UI.odNavReports, description: UI.odNavReportsDesc },
  { key: "funds", path: `${TUSC_PATH}/funds`, label: UI.odNavFunds, description: UI.odNavFundsDesc },
  { key: "documents", path: `${TUSC_PATH}/documents`, label: UI.odNavDocuments, description: UI.odNavDocumentsDesc },
  { key: "data", path: `${TUSC_PATH}/data`, label: UI.odNavData, description: UI.odNavDataDesc },
];

export function tuscSection(key: TuscSectionKey): TuscSection {
  const section = TUSC_SECTIONS.find((s) => s.key === key);
  if (!section) throw new Error(`Unknown TUSC section ${key}`);
  return section;
}

export function documentPath(slug: string): string {
  return `${TUSC_PATH}/documents/${slug}`;
}
