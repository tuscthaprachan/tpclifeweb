import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { DatasetKey } from "@/lib/open-data/datasets";
import { TUSC_PATH } from "../sections";

export interface DatasetInfo {
  key: DatasetKey;
  title: LocaleString;
  description: LocaleString;
  usedIn: { href: string; label: LocaleString }[];
}

const section = (name: string, label: LocaleString) => ({ href: `${TUSC_PATH}/${name}`, label });

/** The datasets in the order the data page lists them. */
export const DATASET_INFO: readonly DatasetInfo[] = [
  { key: "members", title: UI.odDataMembersTitle, description: UI.odDataMembersDesc, usedIn: [section("people", UI.odNavPeople), section("committees", UI.odNavCommittees)] },
  { key: "committees", title: UI.odDataCommitteesTitle, description: UI.odDataCommitteesDesc, usedIn: [section("committees", UI.odNavCommittees)] },
  { key: "meetings", title: UI.odDataMeetingsTitle, description: UI.odDataMeetingsDesc, usedIn: [section("meetings", UI.odNavMeetings)] },
  { key: "decisions", title: UI.odDataDecisionsTitle, description: UI.odDataDecisionsDesc, usedIn: [section("decisions", UI.odNavDecisions), section("meetings", UI.odNavMeetings)] },
  { key: "budget-lines", title: UI.odDataBudgetTitle, description: UI.odDataBudgetDesc, usedIn: [section("budget", UI.odNavBudget)] },
  { key: "recommendations", title: UI.odDataRecommendationsTitle, description: UI.odDataRecommendationsDesc, usedIn: [section("reports", UI.odNavReports)] },
  { key: "funds", title: UI.odDataFundsTitle, description: UI.odDataFundsDesc, usedIn: [section("funds", UI.odNavFunds)] },
  { key: "canteen-survey", title: UI.odDataSurveyTitle, description: UI.odDataSurveyDesc, usedIn: [section("reports", UI.odNavReports)] },
];
