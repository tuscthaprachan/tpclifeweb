import type { StatusTone } from "@/components/ui/StatusTag";
import type { Locale, LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { inlineText, parseMarkdown } from "@/lib/open-data/markdown";
import type { DecisionRow, DocumentSummary, MeetingRow } from "@/lib/open-data/read";
import { fillText } from "../fill";
import { TUSC_PATH } from "../sections";

export const DATA_PATH = `${TUSC_PATH}/data`;

export function meetingPath(slug: string): string {
  return `${TUSC_PATH}/meetings/${slug}`;
}

export function sessionLabel(meeting: Pick<MeetingRow, "sessionType" | "session">, locale: Locale): string {
  const template = meeting.sessionType === "extraordinary" ? UI.odMtExtraordinary : UI.odMtOrdinary;
  return fillText(template[locale], { session: meeting.session });
}

export function meetingLabel(meeting: Pick<MeetingRow, "sessionType" | "session" | "meeting">, locale: Locale): string {
  return fillText(UI.odMtSessionMeeting[locale], { session: sessionLabel(meeting, locale), n: meeting.meeting });
}

export interface SessionGroup {
  key: string;
  sessionType: string;
  session: number;
  academicYear: number;
  /** Newest meeting first. */
  meetings: MeetingRow[];
}

/** Meetings grouped by session, the newest session first and the newest meeting first within it. */
export function groupBySession(meetings: readonly MeetingRow[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const meeting of [...meetings].sort((a, b) => (a.meetingDate < b.meetingDate ? 1 : a.meetingDate > b.meetingDate ? -1 : 0))) {
    const key = `${meeting.sessionType}-${meeting.session}-${meeting.academicYear}`;
    const group = groups.get(key);
    if (group) group.meetings.push(meeting);
    else groups.set(key, { key, sessionType: meeting.sessionType, session: meeting.session, academicYear: meeting.academicYear, meetings: [meeting] });
  }
  return [...groups.values()];
}

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

function westernDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)));
}

export interface MeetingHeader {
  /** The printed date and time line, such as "วันพฤหัสบดีที่ 8 มกราคม 2569 เวลา 16.30 น.". */
  dateLine: string | null;
  /** The printed place line, starting "ณ". */
  placeLine: string | null;
  /** The scheduled time in 24 hour form, such as "16:30". */
  time: string | null;
}

/** The header lines the minutes print above the attendance lists. */
export function meetingHeader(markdown: string): MeetingHeader {
  const lines: string[] = [];
  for (const block of parseMarkdown(markdown)) {
    if (block.t === "heading" && block.level >= 2 && /รายชื่อผู้/.test(inlineText(block.c))) break;
    if (block.t === "heading" || block.t === "paragraph") lines.push(...inlineText(block.c).split("\n"));
  }
  const clean = lines.map((line) => line.trim()).filter(Boolean);
  const dateLine = clean.find((line) => /^วัน/.test(line) && /เวลา/.test(line)) ?? null;
  const placeLine = clean.find((line) => /^ณ\s/.test(line)) ?? null;
  const match = dateLine ? /เวลา\s*([0-9๐-๙]{1,2})\s*[.:]\s*([0-9๐-๙]{2})/.exec(dateLine) : null;
  const time = match?.[1] && match[2] ? `${westernDigits(match[1]).padStart(2, "0")}:${westernDigits(match[2])}` : null;
  return { dateLine, placeLine, time };
}

export interface AgendaItem {
  id: string;
  label: string;
  /** 1 for a section of the agenda, 2 for an item inside it. */
  depth: 1 | 2;
}

/** The agenda headings of the minutes, in order, from the anchors the transcription carries. */
export function agendaItems(markdown: string): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const block of parseMarkdown(markdown)) {
    if (block.t !== "heading") continue;
    const id = block.ids.find((candidate) => /^item-/.test(candidate));
    if (!id) continue;
    items.push({ id, label: inlineText(block.c).trim(), depth: block.level <= 2 ? 1 : 2 });
  }
  return items;
}

export interface AgendaNode extends AgendaItem {
  children: AgendaItem[];
}

export function nestAgenda(items: readonly AgendaItem[]): AgendaNode[] {
  const nodes: AgendaNode[] = [];
  for (const item of items) {
    const last = nodes[nodes.length - 1];
    if (item.depth === 2 && last) last.children.push(item);
    else nodes.push({ ...item, depth: 1, children: [] });
  }
  return nodes;
}

/** The documents that belong to a meeting: minutes, agenda, papers filed with it, and earlier versions of the minutes. */
export function meetingDocuments(meeting: MeetingRow, documents: readonly DocumentSummary[]): DocumentSummary[] {
  const minutes = documents.find((doc) => doc.slug === meeting.minutesDocumentSlug);
  const agenda = documents.find((doc) => doc.slug === meeting.agendaDocumentSlug);
  const folder = meeting.titleTh ? `การประชุมสภานักศึกษาฯ ท่าพระจันทร์ ${meeting.titleTh}/` : null;
  const papers = folder ? documents.filter((doc) => doc.driveFolderPath.includes(folder) && doc !== minutes && doc !== agenda) : [];
  const earlier = minutes ? documents.filter((doc) => doc.replacedById === minutes.id && !papers.includes(doc)) : [];
  return [minutes, agenda, ...papers, ...earlier].filter((doc): doc is DocumentSummary => doc !== undefined);
}

export const DECISION_TOPICS = ["appointments", "budget", "rules", "committees", "other"] as const;
export const DECISION_OUTCOMES = ["approved", "adopted", "noted", "agreed", "granted", "deferred"] as const;

const TOPIC_LABEL: Record<string, LocaleString> = {
  appointments: UI.odDcTopicAppointments,
  budget: UI.odDcTopicBudget,
  rules: UI.odDcTopicRules,
  committees: UI.odDcTopicCommittees,
  other: UI.odDcTopicOther,
};

const OUTCOME_LABEL: Record<string, LocaleString> = {
  approved: UI.odDcOutcomeApproved,
  adopted: UI.odDcOutcomeAdopted,
  noted: UI.odDcOutcomeNoted,
  agreed: UI.odDcOutcomeAgreed,
  granted: UI.odDcOutcomeGranted,
  deferred: UI.odDcOutcomeDeferred,
};

const OUTCOME_TONE: Record<string, StatusTone> = {
  approved: "success",
  adopted: "success",
  granted: "success",
  noted: "info",
  agreed: "info",
  deferred: "warning",
};

export function topicLabel(topic: string, locale: Locale): string {
  return (TOPIC_LABEL[topic] ?? UI.odDcTopicOther)[locale];
}

export function outcomeLabel(outcome: string, locale: Locale): string {
  return OUTCOME_LABEL[outcome]?.[locale] ?? outcome;
}

export function outcomeTone(outcome: string): StatusTone {
  return OUTCOME_TONE[outcome] ?? "neutral";
}

/** A vote figure as printed; the bracketed placeholders the data uses are shown in the page language. */
export function printedValue(value: string | null, locale: Locale): string {
  if (value === null || value === "" || value === "[not stated]") return UI.odNotStated[locale];
  if (value === "[no vote]") return UI.odDcNoVote[locale];
  if (value === "[not applicable]") return UI.odDcNotApplicable[locale];
  return value;
}

export function decisionText(decision: Pick<DecisionRow, "textTh" | "textEn">, locale: Locale): string {
  const [first, second] = locale === "th" ? [decision.textTh, decision.textEn] : [decision.textEn, decision.textTh];
  return first || second;
}
