import type { LocaleString, Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { DocumentSummary } from "@/lib/open-data/read";
import { documentDate } from "../documents";

export interface RuleGroup {
  key: string;
  title: LocaleString;
  numbers: readonly string[];
}

/** The rules the council works under, by what they are about. Numbers are the source file numbers. */
export const RULE_GROUPS: readonly RuleGroup[] = [
  { key: "council", title: UI.odRlGroupCouncil, numbers: ["26", "24"] },
  { key: "elections", title: UI.odRlGroupElections, numbers: ["19", "20"] },
  { key: "money", title: UI.odRlGroupMoney, numbers: ["21"] },
  { key: "activities", title: UI.odRlGroupActivities, numbers: ["15", "23", "22"] },
  { key: "university", title: UI.odRlGroupUniversity, numbers: ["18", "16"] },
];

export const RULE_NUMBERS: readonly string[] = RULE_GROUPS.flatMap((group) => group.numbers);

/** The operation regulation of 2026 and its English translation. */
export const OPERATION_RULE_NUMBER = "26";
export const OPERATION_TRANSLATION_NUMBER = "25";
/** The regulation the others in this set rest on, linked from the notes on how they fit together. */
export const ROOT_RULE_NUMBER = "18";

export const RULE_DESCRIPTION: Record<string, LocaleString> = {
  "26": UI.odRlDesc26,
  "24": UI.odRlDesc24,
  "19": UI.odRlDesc19,
  "20": UI.odRlDesc20,
  "21": UI.odRlDesc21,
  "15": UI.odRlDesc15,
  "23": UI.odRlDesc23,
  "22": UI.odRlDesc22,
  "18": UI.odRlDesc18,
  "16": UI.odRlDesc16,
};

const ENGLISH_DATE: Record<string, string> = {
  "16": "19 [month illegible] 2012",
  "18": "[?] October 2020",
  "23": "[day not stated] February 2025",
};

/** The date as printed. English shows the Gregorian date, or the partial date as the document gives it. */
export function ruleDate(doc: Pick<DocumentSummary, "number" | "dateText" | "dateIso">, locale: Locale): string {
  if (locale === "en" && !doc.dateIso) return ENGLISH_DATE[doc.number] ?? documentDate(doc, locale);
  return documentDate(doc, locale);
}

export type RuleStatus = "in-force" | "replaced";

/** In force unless a newer document replaces it. This is the open data team's reading, not the council's. */
export function ruleStatus(doc: Pick<DocumentSummary, "replacedById">): RuleStatus {
  return doc.replacedById ? "replaced" : "in-force";
}

export function ruleStatusLabel(status: RuleStatus): LocaleString {
  return status === "replaced" ? UI.odRlStatusReplaced : UI.odRlStatusInForce;
}

export interface RuleMeaning {
  text: LocaleString;
  clause: number;
}

/** What the operation regulation means for a student, each point tied to the clause it comes from. */
export const OPERATION_RULE_MEANINGS: readonly RuleMeaning[] = [
  { text: UI.odRlMean1, clause: 8 },
  { text: UI.odRlMean2, clause: 39 },
  { text: UI.odRlMean3, clause: 60 },
  { text: UI.odRlMean4, clause: 56 },
  { text: UI.odRlMean5, clause: 10 },
  { text: UI.odRlMean6, clause: 83 },
  { text: UI.odRlMean7, clause: 113 },
  { text: UI.odRlMean8, clause: 119 },
];

export function rulesInOrder(docs: readonly DocumentSummary[]): DocumentSummary[] {
  const byNumber = new Map(docs.map((doc) => [doc.number, doc]));
  return RULE_NUMBERS.flatMap((number) => byNumber.get(number) ?? []);
}

export function rulePath(slug: string): string {
  return `/about/open-data/tusc/rules/${slug}`;
}
