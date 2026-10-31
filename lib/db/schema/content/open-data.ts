import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns } from "./common";
import { ownerEnum } from "./enums";

/**
 * Student body open data (docs/tusc-open-data-plan.md). Everything here is
 * served as the body published it: text columns keep the printed value,
 * including bracketed markers such as "[not stated]"; only columns that are
 * typed (dates, whole numbers, money) hold null where the source has a marker.
 *
 * Every table carries `owner` so TUSU's data can sit beside TUSC's. Only
 * `tusc` and `tusu` are allowed here.
 */

export const OPEN_DATA_OWNERS = ["tusc", "tusu"] as const;
export type OpenDataOwner = (typeof OPEN_DATA_OWNERS)[number];

export const OPEN_DATA_DOCUMENT_TYPES = [
  "announcement",
  "regulation",
  "university-regulation",
  "agenda",
  "minutes",
  "report",
  "fund-list",
  "guide",
  "other",
] as const;
export type OpenDataDocumentType = (typeof OPEN_DATA_DOCUMENT_TYPES)[number];
export const openDataDocumentTypeEnum = pgEnum("open_data_document_type", OPEN_DATA_DOCUMENT_TYPES);

export const OPEN_DATA_BODY_KINDS = ["council", "committee", "office"] as const;
export type OpenDataBodyKind = (typeof OPEN_DATA_BODY_KINDS)[number];
export const openDataBodyKindEnum = pgEnum("open_data_body_kind", OPEN_DATA_BODY_KINDS);

export const OPEN_DATA_SESSION_TYPES = ["ordinary", "extraordinary"] as const;
export type OpenDataSessionType = (typeof OPEN_DATA_SESSION_TYPES)[number];
export const openDataSessionTypeEnum = pgEnum("open_data_session_type", OPEN_DATA_SESSION_TYPES);

export const OPEN_DATA_BUDGET_VIEWS = ["organisation", "project", "category"] as const;
export type OpenDataBudgetView = (typeof OPEN_DATA_BUDGET_VIEWS)[number];
export const openDataBudgetViewEnum = pgEnum("open_data_budget_view", OPEN_DATA_BUDGET_VIEWS);

const owner = () => ownerEnum("owner").notNull().default("tusc");
const ownerCheck = (name: string, column: AnyPgColumn) => check(name, sql`${column} in ('tusc', 'tusu')`);

export const openDataDocuments = pgTable(
  "open_data_documents",
  {
    ...contentColumns(),
    owner: owner(),
    /** The two digit number the source file carries in the manifest ("01" to "49"). */
    number: text("number").notNull(),
    slug: text("slug").notNull(),
    type: openDataDocumentTypeEnum("type").notNull(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    issuerTh: text("issuer_th"),
    issuerEn: text("issuer_en"),
    reference: text("reference"),
    /** The date as printed, in any era. */
    dateText: text("date_text"),
    /** Set only when the source gives a complete ISO date. */
    dateIso: date("date_iso", { mode: "string" }),
    signatory: text("signatory"),
    pages: integer("pages"),
    scan: boolean("scan").notNull().default(false),
    driveFolderPath: text("drive_folder_path").notNull().default(""),
    driveFileName: text("drive_file_name").notNull().default(""),
    driveUrl: text("drive_url").notNull().default(""),
    /** Storage key of the mirrored original. Null until scripts/open-data-mirror.ts has run. */
    fileKey: text("file_key"),
    fileUrl: text("file_url"),
    /** Size of the original; the mirror overwrites the manifest figure with the stored size. */
    fileBytes: integer("file_bytes"),
    fileContentType: text("file_content_type"),
    /** The transcription: everything after the front matter, as written. */
    transcriptMarkdown: text("transcript_markdown").notNull().default(""),
    replacedById: uuid("replaced_by_id").references((): AnyPgColumn => openDataDocuments.id, { onDelete: "set null" }),
  },
  (t) => [
    ownerCheck("open_data_documents_owner", t.owner),
    check("open_data_documents_pages", sql`${t.pages} is null or ${t.pages} >= 0`),
    unique("open_data_documents_number").on(t.owner, t.number),
    unique("open_data_documents_slug").on(t.owner, t.slug),
    index("open_data_documents_listing_idx").on(t.owner, t.status, t.number),
    index("open_data_documents_date_idx").on(t.dateIso),
  ],
);

export const openDataPeople = pgTable(
  "open_data_people",
  {
    ...contentColumns(),
    owner: owner(),
    nameTh: text("name_th").notNull(),
    nameLatin: text("name_latin"),
    faculty: text("faculty"),
    party: text("party"),
  },
  (t) => [ownerCheck("open_data_people_owner", t.owner), unique("open_data_people_name").on(t.owner, t.nameTh)],
);

export const openDataBodies = pgTable(
  "open_data_bodies",
  {
    ...contentColumns(),
    owner: owner(),
    slug: text("slug").notNull(),
    kind: openDataBodyKindEnum("kind").notNull(),
    nameTh: text("name_th").notNull(),
    nameEn: text("name_en"),
    /** The type as the committees dataset prints it. */
    committeeType: text("committee_type"),
    parentId: uuid("parent_id").references((): AnyPgColumn => openDataBodies.id, { onDelete: "set null" }),
    remit: text("remit"),
    legalBasis: text("legal_basis"),
    appointedOn: date("appointed_on", { mode: "string" }),
    endedOn: date("ended_on", { mode: "string" }),
    membersAsAppointed: integer("members_as_appointed"),
    chair: text("chair"),
    /** As printed in the dataset ("active" or a marker). */
    activity: text("activity"),
    sourceDocumentId: uuid("source_document_id").references(() => openDataDocuments.id, { onDelete: "set null" }),
  },
  (t) => [
    ownerCheck("open_data_bodies_owner", t.owner),
    unique("open_data_bodies_slug").on(t.owner, t.slug),
    unique("open_data_bodies_name").on(t.owner, t.nameTh),
  ],
);

export const openDataMemberships = pgTable(
  "open_data_memberships",
  {
    ...contentColumns(),
    owner: owner(),
    personId: uuid("person_id")
      .notNull()
      .references(() => openDataPeople.id, { onDelete: "cascade" }),
    bodyId: uuid("body_id")
      .notNull()
      .references(() => openDataBodies.id, { onDelete: "cascade" }),
    roleTh: text("role_th").notNull(),
    roleEn: text("role_en"),
    fromDate: date("from_date", { mode: "string" }),
    toDate: date("to_date", { mode: "string" }),
    sourceDocumentId: uuid("source_document_id").references(() => openDataDocuments.id, { onDelete: "set null" }),
    /** Every source document number as printed ("02;45"). */
    sourceDocuments: text("source_documents"),
    sourceAnchor: text("source_anchor"),
  },
  (t) => [
    ownerCheck("open_data_memberships_owner", t.owner),
    unique("open_data_memberships_natural").on(t.personId, t.bodyId, t.roleTh, t.fromDate).nullsNotDistinct(),
    index("open_data_memberships_body_idx").on(t.bodyId),
  ],
);

export const openDataMeetings = pgTable(
  "open_data_meetings",
  {
    ...contentColumns(),
    owner: owner(),
    slug: text("slug").notNull(),
    sessionType: openDataSessionTypeEnum("session_type").notNull(),
    session: integer("session").notNull(),
    meeting: integer("meeting").notNull(),
    titleTh: text("title_th").notNull().default(""),
    academicYear: integer("academic_year").notNull(),
    meetingDate: date("meeting_date", { mode: "string" }).notNull(),
    place: text("place"),
    chair: text("chair"),
    seats: integer("seats"),
    present: integer("present"),
    onLeave: integer("on_leave"),
    absent: integer("absent"),
    minutesAdoptedOn: date("minutes_adopted_on", { mode: "string" }),
    minutesDocumentId: uuid("minutes_document_id").references(() => openDataDocuments.id, { onDelete: "set null" }),
    agendaDocumentId: uuid("agenda_document_id").references(() => openDataDocuments.id, { onDelete: "set null" }),
  },
  (t) => [
    ownerCheck("open_data_meetings_owner", t.owner),
    unique("open_data_meetings_slug").on(t.owner, t.slug),
    unique("open_data_meetings_natural").on(t.owner, t.sessionType, t.session, t.meeting),
    index("open_data_meetings_date_idx").on(t.owner, t.meetingDate),
  ],
);

export const openDataDecisions = pgTable(
  "open_data_decisions",
  {
    ...contentColumns(),
    owner: owner(),
    /** The register reference ("D01"). */
    ref: text("ref").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => openDataMeetings.id, { onDelete: "cascade" }),
    item: text("item").notNull(),
    topic: text("topic").notNull(),
    type: text("type").notNull(),
    textTh: text("text_th").notNull().default(""),
    textEn: text("text_en").notNull().default(""),
    votesFor: text("votes_for"),
    votesAgainst: text("votes_against"),
    votesAbstain: text("votes_abstain"),
    membersVoting: text("members_voting"),
    partyBreakdown: text("party_breakdown"),
    outcome: text("outcome").notNull(),
    amount: text("amount"),
    minutesAnchor: text("minutes_anchor"),
  },
  (t) => [
    ownerCheck("open_data_decisions_owner", t.owner),
    unique("open_data_decisions_ref").on(t.owner, t.ref),
    index("open_data_decisions_meeting_idx").on(t.meetingId),
    index("open_data_decisions_topic_idx").on(t.owner, t.topic),
  ],
);

export const openDataBudgetLines = pgTable(
  "open_data_budget_lines",
  {
    ...contentColumns(),
    owner: owner(),
    fiscalYear: integer("fiscal_year").notNull(),
    view: openDataBudgetViewEnum("view").notNull(),
    organisationType: text("organisation_type").notNull(),
    organisation: text("organisation").notNull(),
    project: text("project").notNull(),
    category: text("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    sourceDocumentId: uuid("source_document_id").references(() => openDataDocuments.id, { onDelete: "set null" }),
    sourcePage: integer("source_page"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    ownerCheck("open_data_budget_lines_owner", t.owner),
    uniqueIndex("open_data_budget_lines_natural").on(t.owner, t.fiscalYear, t.view, t.organisation, t.project, t.category),
    index("open_data_budget_lines_year_idx").on(t.owner, t.fiscalYear, t.view),
  ],
);

export const openDataFunds = pgTable(
  "open_data_funds",
  {
    ...contentColumns(),
    owner: owner(),
    number: integer("number").notNull(),
    type: text("type").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    annotation: text("annotation"),
  },
  (t) => [
    ownerCheck("open_data_funds_owner", t.owner),
    unique("open_data_funds_number").on(t.owner, t.number),
    index("open_data_funds_type_idx").on(t.owner, t.type),
  ],
);

export const openDataRecommendations = pgTable(
  "open_data_recommendations",
  {
    ...contentColumns(),
    owner: owner(),
    reportDocumentId: uuid("report_document_id")
      .notNull()
      .references(() => openDataDocuments.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    textTh: text("text_th").notNull().default(""),
    textEn: text("text_en").notNull().default(""),
    addressedTo: text("addressed_to"),
    urgency: text("urgency"),
    /** The response to the recommendation, as printed. */
    responseStatus: text("response_status"),
    responseDate: text("response_date"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    ownerCheck("open_data_recommendations_owner", t.owner),
    unique("open_data_recommendations_natural").on(t.reportDocumentId, t.section, t.textEn),
  ],
);

export const openDataSurveyResults = pgTable(
  "open_data_survey_results",
  {
    ...contentColumns(),
    owner: owner(),
    reportDocumentId: uuid("report_document_id")
      .notNull()
      .references(() => openDataDocuments.id, { onDelete: "cascade" }),
    problemTh: text("problem_th").notNull(),
    problemEn: text("problem_en").notNull().default(""),
    mentions: integer("mentions").notNull(),
  },
  (t) => [
    ownerCheck("open_data_survey_results_owner", t.owner),
    check("open_data_survey_results_mentions", sql`${t.mentions} >= 0`),
    unique("open_data_survey_results_natural").on(t.reportDocumentId, t.problemTh),
  ],
);

export type OpenDataDocumentRow = typeof openDataDocuments.$inferSelect;
export type OpenDataPersonRow = typeof openDataPeople.$inferSelect;
export type OpenDataBodyRow = typeof openDataBodies.$inferSelect;
export type OpenDataMembershipRow = typeof openDataMemberships.$inferSelect;
export type OpenDataMeetingRow = typeof openDataMeetings.$inferSelect;
export type OpenDataDecisionRow = typeof openDataDecisions.$inferSelect;
export type OpenDataBudgetLineRow = typeof openDataBudgetLines.$inferSelect;
export type OpenDataFundRow = typeof openDataFunds.$inferSelect;
export type OpenDataRecommendationRow = typeof openDataRecommendations.$inferSelect;
export type OpenDataSurveyResultRow = typeof openDataSurveyResults.$inferSelect;
