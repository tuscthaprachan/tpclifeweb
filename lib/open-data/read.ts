import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  openDataBodies,
  openDataBudgetLines,
  openDataDecisions,
  openDataDocuments,
  openDataFunds,
  openDataMeetings,
  openDataMemberships,
  openDataPeople,
  openDataRecommendations,
  openDataSurveyResults,
  type OpenDataOwner,
} from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "@/lib/content/cache";
import { safeFetch } from "@/lib/content/safe-fetch";

/**
 * Student body open data reads. Published rows only, ordered as the source
 * orders them, as plain JSON (dates are ISO strings) so they can sit in the
 * data cache. One cache tag per table group: documents, people (people,
 * bodies, memberships), meetings (meetings, decisions), budget, funds and
 * reports (recommendations, survey).
 */

export interface DocumentSummary {
  id: string;
  number: string;
  slug: string;
  type: string;
  titleTh: string;
  titleEn: string;
  issuerTh: string | null;
  issuerEn: string | null;
  reference: string | null;
  dateText: string | null;
  dateIso: string | null;
  signatory: string | null;
  pages: number | null;
  scan: boolean;
  driveFolderPath: string;
  driveFileName: string;
  driveUrl: string;
  fileKey: string | null;
  fileUrl: string | null;
  fileBytes: number | null;
  fileContentType: string | null;
  replacedById: string | null;
  /** ISO instant the row last changed. */
  updatedAt: string;
}

export interface DocumentFull extends DocumentSummary {
  transcriptMarkdown: string;
  replacedBySlug: string | null;
}

const documentColumns = {
  id: openDataDocuments.id,
  number: openDataDocuments.number,
  slug: openDataDocuments.slug,
  type: openDataDocuments.type,
  titleTh: openDataDocuments.titleTh,
  titleEn: openDataDocuments.titleEn,
  issuerTh: openDataDocuments.issuerTh,
  issuerEn: openDataDocuments.issuerEn,
  reference: openDataDocuments.reference,
  dateText: openDataDocuments.dateText,
  dateIso: openDataDocuments.dateIso,
  signatory: openDataDocuments.signatory,
  pages: openDataDocuments.pages,
  scan: openDataDocuments.scan,
  driveFolderPath: openDataDocuments.driveFolderPath,
  driveFileName: openDataDocuments.driveFileName,
  driveUrl: openDataDocuments.driveUrl,
  fileKey: openDataDocuments.fileKey,
  fileUrl: openDataDocuments.fileUrl,
  fileBytes: openDataDocuments.fileBytes,
  fileContentType: openDataDocuments.fileContentType,
  replacedById: openDataDocuments.replacedById,
  updatedAt: openDataDocuments.updatedAt,
};

export async function readDocuments(db: AuditExecutor, owner: OpenDataOwner): Promise<DocumentSummary[]> {
  const rows = await db
    .select(documentColumns)
    .from(openDataDocuments)
    .where(and(eq(openDataDocuments.owner, owner), eq(openDataDocuments.status, "published")))
    .orderBy(asc(openDataDocuments.number));
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

export async function readDocument(db: AuditExecutor, owner: OpenDataOwner, slug: string): Promise<DocumentFull | null> {
  const [row] = await db
    .select({ ...documentColumns, transcriptMarkdown: openDataDocuments.transcriptMarkdown })
    .from(openDataDocuments)
    .where(and(eq(openDataDocuments.owner, owner), eq(openDataDocuments.slug, slug), eq(openDataDocuments.status, "published")))
    .limit(1);
  if (!row) return null;
  const [replacedBy] = row.replacedById
    ? await db.select({ slug: openDataDocuments.slug }).from(openDataDocuments).where(eq(openDataDocuments.id, row.replacedById))
    : [];
  return { ...row, updatedAt: row.updatedAt.toISOString(), replacedBySlug: replacedBy?.slug ?? null };
}

async function documentRefs(db: AuditExecutor, owner: OpenDataOwner): Promise<Map<string, { number: string; slug: string }>> {
  const rows = await db
    .select({ id: openDataDocuments.id, number: openDataDocuments.number, slug: openDataDocuments.slug })
    .from(openDataDocuments)
    .where(eq(openDataDocuments.owner, owner));
  return new Map(rows.map((r) => [r.id, { number: r.number, slug: r.slug }]));
}

export interface BodyRow {
  id: string;
  slug: string;
  kind: string;
  nameTh: string;
  nameEn: string | null;
  committeeType: string | null;
  parentSlug: string | null;
  remit: string | null;
  legalBasis: string | null;
  appointedOn: string | null;
  endedOn: string | null;
  membersAsAppointed: number | null;
  chair: string | null;
  activity: string | null;
  sourceDocumentSlug: string | null;
}

export interface MembershipRow {
  personId: string;
  personNameTh: string;
  personNameLatin: string | null;
  faculty: string | null;
  party: string | null;
  bodySlug: string;
  bodyNameTh: string;
  roleTh: string;
  fromDate: string | null;
  toDate: string | null;
  sourceDocumentSlug: string | null;
  sourceDocuments: string | null;
  sourceAnchor: string | null;
}

export async function readBodies(db: AuditExecutor, owner: OpenDataOwner): Promise<BodyRow[]> {
  const [rows, docs] = await Promise.all([
    db
      .select()
      .from(openDataBodies)
      .where(and(eq(openDataBodies.owner, owner), eq(openDataBodies.status, "published")))
      .orderBy(asc(openDataBodies.kind), asc(openDataBodies.slug)),
    documentRefs(db, owner),
  ]);
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    nameTh: r.nameTh,
    nameEn: r.nameEn,
    committeeType: r.committeeType,
    parentSlug: r.parentId ? (slugById.get(r.parentId) ?? null) : null,
    remit: r.remit,
    legalBasis: r.legalBasis,
    appointedOn: r.appointedOn,
    endedOn: r.endedOn,
    membersAsAppointed: r.membersAsAppointed,
    chair: r.chair,
    activity: r.activity,
    sourceDocumentSlug: r.sourceDocumentId ? (docs.get(r.sourceDocumentId)?.slug ?? null) : null,
  }));
}

export async function readMemberships(db: AuditExecutor, owner: OpenDataOwner): Promise<MembershipRow[]> {
  const [rows, docs] = await Promise.all([
    db
      .select({
        personId: openDataPeople.id,
        personNameTh: openDataPeople.nameTh,
        personNameLatin: openDataPeople.nameLatin,
        faculty: openDataPeople.faculty,
        party: openDataPeople.party,
        bodySlug: openDataBodies.slug,
        bodyNameTh: openDataBodies.nameTh,
        roleTh: openDataMemberships.roleTh,
        fromDate: openDataMemberships.fromDate,
        toDate: openDataMemberships.toDate,
        sourceDocumentId: openDataMemberships.sourceDocumentId,
        sourceDocuments: openDataMemberships.sourceDocuments,
        sourceAnchor: openDataMemberships.sourceAnchor,
      })
      .from(openDataMemberships)
      .innerJoin(openDataPeople, eq(openDataPeople.id, openDataMemberships.personId))
      .innerJoin(openDataBodies, eq(openDataBodies.id, openDataMemberships.bodyId))
      .where(and(eq(openDataMemberships.owner, owner), eq(openDataMemberships.status, "published")))
      .orderBy(asc(openDataPeople.nameTh), asc(openDataBodies.slug), asc(openDataMemberships.fromDate)),
    documentRefs(db, owner),
  ]);
  return rows.map(({ sourceDocumentId, ...r }) => ({
    ...r,
    sourceDocumentSlug: sourceDocumentId ? (docs.get(sourceDocumentId)?.slug ?? null) : null,
  }));
}

export interface MeetingRow {
  id: string;
  slug: string;
  sessionType: string;
  session: number;
  meeting: number;
  titleTh: string;
  academicYear: number;
  meetingDate: string;
  place: string | null;
  chair: string | null;
  seats: number | null;
  present: number | null;
  onLeave: number | null;
  absent: number | null;
  minutesAdoptedOn: string | null;
  minutesDocumentSlug: string | null;
  agendaDocumentSlug: string | null;
}

export interface DecisionRow {
  id: string;
  ref: string;
  meetingSlug: string;
  meetingDate: string;
  item: string;
  topic: string;
  type: string;
  textTh: string;
  textEn: string;
  votesFor: string | null;
  votesAgainst: string | null;
  votesAbstain: string | null;
  membersVoting: string | null;
  partyBreakdown: string | null;
  outcome: string;
  amount: string | null;
  minutesAnchor: string | null;
}

export async function readMeetings(db: AuditExecutor, owner: OpenDataOwner): Promise<MeetingRow[]> {
  const [rows, docs] = await Promise.all([
    db
      .select()
      .from(openDataMeetings)
      .where(and(eq(openDataMeetings.owner, owner), eq(openDataMeetings.status, "published")))
      .orderBy(asc(openDataMeetings.meetingDate)),
    documentRefs(db, owner),
  ]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sessionType: r.sessionType,
    session: r.session,
    meeting: r.meeting,
    titleTh: r.titleTh,
    academicYear: r.academicYear,
    meetingDate: r.meetingDate,
    place: r.place,
    chair: r.chair,
    seats: r.seats,
    present: r.present,
    onLeave: r.onLeave,
    absent: r.absent,
    minutesAdoptedOn: r.minutesAdoptedOn,
    minutesDocumentSlug: r.minutesDocumentId ? (docs.get(r.minutesDocumentId)?.slug ?? null) : null,
    agendaDocumentSlug: r.agendaDocumentId ? (docs.get(r.agendaDocumentId)?.slug ?? null) : null,
  }));
}

export async function readDecisions(db: AuditExecutor, owner: OpenDataOwner): Promise<DecisionRow[]> {
  const rows = await db
    .select({
      id: openDataDecisions.id,
      ref: openDataDecisions.ref,
      meetingSlug: openDataMeetings.slug,
      meetingDate: openDataMeetings.meetingDate,
      item: openDataDecisions.item,
      topic: openDataDecisions.topic,
      type: openDataDecisions.type,
      textTh: openDataDecisions.textTh,
      textEn: openDataDecisions.textEn,
      votesFor: openDataDecisions.votesFor,
      votesAgainst: openDataDecisions.votesAgainst,
      votesAbstain: openDataDecisions.votesAbstain,
      membersVoting: openDataDecisions.membersVoting,
      partyBreakdown: openDataDecisions.partyBreakdown,
      outcome: openDataDecisions.outcome,
      amount: openDataDecisions.amount,
      minutesAnchor: openDataDecisions.minutesAnchor,
    })
    .from(openDataDecisions)
    .innerJoin(openDataMeetings, eq(openDataMeetings.id, openDataDecisions.meetingId))
    .where(and(eq(openDataDecisions.owner, owner), eq(openDataDecisions.status, "published")))
    .orderBy(asc(openDataMeetings.meetingDate), asc(openDataDecisions.ref));
  return rows;
}

export interface BudgetLineRow {
  id: string;
  fiscalYear: number;
  view: string;
  organisationType: string;
  organisation: string;
  project: string;
  category: string;
  amount: string;
  sourceDocumentSlug: string | null;
  sourcePage: number | null;
}

export async function readBudgetLines(db: AuditExecutor, owner: OpenDataOwner, fiscalYear?: number): Promise<BudgetLineRow[]> {
  const [rows, docs] = await Promise.all([
    db
      .select()
      .from(openDataBudgetLines)
      .where(
        and(
          eq(openDataBudgetLines.owner, owner),
          eq(openDataBudgetLines.status, "published"),
          fiscalYear === undefined ? undefined : eq(openDataBudgetLines.fiscalYear, fiscalYear),
        ),
      )
      .orderBy(asc(openDataBudgetLines.fiscalYear), asc(openDataBudgetLines.view), asc(openDataBudgetLines.position)),
    documentRefs(db, owner),
  ]);
  return rows.map((r) => ({
    id: r.id,
    fiscalYear: r.fiscalYear,
    view: r.view,
    organisationType: r.organisationType,
    organisation: r.organisation,
    project: r.project,
    category: r.category,
    amount: r.amount,
    sourceDocumentSlug: r.sourceDocumentId ? (docs.get(r.sourceDocumentId)?.slug ?? null) : null,
    sourcePage: r.sourcePage,
  }));
}

export interface FundRow {
  number: number;
  type: string;
  code: string;
  name: string;
  annotation: string | null;
}

export async function readFunds(db: AuditExecutor, owner: OpenDataOwner): Promise<FundRow[]> {
  return db
    .select({
      number: openDataFunds.number,
      type: openDataFunds.type,
      code: openDataFunds.code,
      name: openDataFunds.name,
      annotation: openDataFunds.annotation,
    })
    .from(openDataFunds)
    .where(and(eq(openDataFunds.owner, owner), eq(openDataFunds.status, "published")))
    .orderBy(asc(openDataFunds.number));
}

export interface RecommendationRow {
  id: string;
  reportDocumentSlug: string;
  section: string;
  textTh: string;
  textEn: string;
  addressedTo: string | null;
  urgency: string | null;
  responseStatus: string | null;
  responseDate: string | null;
}

export interface SurveyResultRow {
  reportDocumentSlug: string;
  problemTh: string;
  problemEn: string;
  mentions: number;
}

export async function readRecommendations(db: AuditExecutor, owner: OpenDataOwner): Promise<RecommendationRow[]> {
  const rows = await db
    .select({
      id: openDataRecommendations.id,
      reportDocumentSlug: openDataDocuments.slug,
      section: openDataRecommendations.section,
      textTh: openDataRecommendations.textTh,
      textEn: openDataRecommendations.textEn,
      addressedTo: openDataRecommendations.addressedTo,
      urgency: openDataRecommendations.urgency,
      responseStatus: openDataRecommendations.responseStatus,
      responseDate: openDataRecommendations.responseDate,
    })
    .from(openDataRecommendations)
    .innerJoin(openDataDocuments, eq(openDataDocuments.id, openDataRecommendations.reportDocumentId))
    .where(and(eq(openDataRecommendations.owner, owner), eq(openDataRecommendations.status, "published")))
    .orderBy(asc(openDataRecommendations.position));
  return rows;
}

export async function readSurveyResults(db: AuditExecutor, owner: OpenDataOwner): Promise<SurveyResultRow[]> {
  return db
    .select({
      reportDocumentSlug: openDataDocuments.slug,
      problemTh: openDataSurveyResults.problemTh,
      problemEn: openDataSurveyResults.problemEn,
      mentions: openDataSurveyResults.mentions,
    })
    .from(openDataSurveyResults)
    .innerJoin(openDataDocuments, eq(openDataDocuments.id, openDataSurveyResults.reportDocumentId))
    .where(and(eq(openDataSurveyResults.owner, owner), eq(openDataSurveyResults.status, "published")))
    .orderBy(asc(openDataSurveyResults.mentions));
}

const day = REVALIDATE.content;

const cachedDocuments = cachedRead(["open-data-documents", "v1"], [CACHE_TAGS.openDataDocuments], day, (owner: OpenDataOwner) =>
  readDocuments(getDb(), owner),
);
const cachedDocument = cachedRead(
  ["open-data-document", "v1"],
  [CACHE_TAGS.openDataDocuments],
  day,
  (owner: OpenDataOwner, slug: string) => readDocument(getDb(), owner, slug),
);
const cachedBodies = cachedRead(["open-data-bodies", "v1"], [CACHE_TAGS.openDataPeople], day, (owner: OpenDataOwner) =>
  readBodies(getDb(), owner),
);
const cachedMemberships = cachedRead(["open-data-memberships", "v1"], [CACHE_TAGS.openDataPeople], day, (owner: OpenDataOwner) =>
  readMemberships(getDb(), owner),
);
const cachedMeetings = cachedRead(["open-data-meetings", "v1"], [CACHE_TAGS.openDataMeetings], day, (owner: OpenDataOwner) =>
  readMeetings(getDb(), owner),
);
const cachedDecisions = cachedRead(["open-data-decisions", "v1"], [CACHE_TAGS.openDataMeetings], day, (owner: OpenDataOwner) =>
  readDecisions(getDb(), owner),
);
const cachedBudgetLines = cachedRead(
  ["open-data-budget-lines", "v1"],
  [CACHE_TAGS.openDataBudget],
  day,
  (owner: OpenDataOwner, fiscalYear: number | null) => readBudgetLines(getDb(), owner, fiscalYear ?? undefined),
);
const cachedFunds = cachedRead(["open-data-funds", "v1"], [CACHE_TAGS.openDataFunds], day, (owner: OpenDataOwner) =>
  readFunds(getDb(), owner),
);
const cachedRecommendations = cachedRead(
  ["open-data-recommendations", "v1"],
  [CACHE_TAGS.openDataReports],
  day,
  (owner: OpenDataOwner) => readRecommendations(getDb(), owner),
);
const cachedSurveyResults = cachedRead(["open-data-survey", "v1"], [CACHE_TAGS.openDataReports], day, (owner: OpenDataOwner) =>
  readSurveyResults(getDb(), owner),
);

export const getOpenDataDocuments = (owner: OpenDataOwner = "tusc") =>
  safeFetch<DocumentSummary[]>("getOpenDataDocuments", () => cachedDocuments(owner), []);
export const getOpenDataDocument = (slug: string, owner: OpenDataOwner = "tusc") =>
  safeFetch<DocumentFull | null>("getOpenDataDocument", () => cachedDocument(owner, slug), null);
export const getOpenDataBodies = (owner: OpenDataOwner = "tusc") =>
  safeFetch<BodyRow[]>("getOpenDataBodies", () => cachedBodies(owner), []);
export const getOpenDataMemberships = (owner: OpenDataOwner = "tusc") =>
  safeFetch<MembershipRow[]>("getOpenDataMemberships", () => cachedMemberships(owner), []);
export const getOpenDataMeetings = (owner: OpenDataOwner = "tusc") =>
  safeFetch<MeetingRow[]>("getOpenDataMeetings", () => cachedMeetings(owner), []);
export const getOpenDataDecisions = (owner: OpenDataOwner = "tusc") =>
  safeFetch<DecisionRow[]>("getOpenDataDecisions", () => cachedDecisions(owner), []);
export const getOpenDataBudgetLines = (fiscalYear?: number, owner: OpenDataOwner = "tusc") =>
  safeFetch<BudgetLineRow[]>("getOpenDataBudgetLines", () => cachedBudgetLines(owner, fiscalYear ?? null), []);
export const getOpenDataFunds = (owner: OpenDataOwner = "tusc") =>
  safeFetch<FundRow[]>("getOpenDataFunds", () => cachedFunds(owner), []);
export const getOpenDataRecommendations = (owner: OpenDataOwner = "tusc") =>
  safeFetch<RecommendationRow[]>("getOpenDataRecommendations", () => cachedRecommendations(owner), []);
export const getOpenDataSurveyResults = (owner: OpenDataOwner = "tusc") =>
  safeFetch<SurveyResultRow[]>("getOpenDataSurveyResults", () => cachedSurveyResults(owner), []);
