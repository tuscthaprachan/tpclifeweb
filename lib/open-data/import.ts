/**
 * Loads the TUSC open data from the repository files into Postgres:
 * data/open-data/tusc/manifest.json, transcripts/NN.md and tables/*.csv.
 *
 * Insert if missing, never overwrite, so a re-run keeps whatever an editor has
 * changed. Values are stored as published: nothing is corrected, recomputed or
 * annotated. Text columns keep the printed value, markers included; typed
 * columns (dates, whole numbers, money) hold null where the source has a
 * marker. No `server-only` import: this runs under tsx and PGlite.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import type { AuditExecutor } from "../db/audit";
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
  OPEN_DATA_BUDGET_VIEWS,
  OPEN_DATA_DOCUMENT_TYPES,
  type OpenDataBodyKind,
  type OpenDataBudgetView,
  type OpenDataDocumentType,
  type OpenDataSessionType,
} from "../db/schema/content/open-data";
import { slugify } from "../db/seed/util";
import { intOrNull, isMarker, isoDateOrNull, parseCsv, parseFrontMatter, textOrNull } from "./parse";

export const OPEN_DATA_DIR = join(process.cwd(), "data", "open-data", "tusc");

const OWNER = "tusc" as const;
const CHUNK = 100;

/** The signed minutes that replace the unsigned drafts (docs/tusc-open-data-plan.md, "The source"). */
const REPLACED_BY: Record<string, string> = { "28": "41", "29": "42" };

const COUNCIL_MEMBER_ROLE = "สมาชิกสภานักศึกษา";
const COUNCIL_MEMBER_FROM = "2025-05-08";

/** The party names the other tables use for the parties printed in the Rector's announcement. */
const PARTY_NAMES: Record<string, string> = { "พรรครีนิว ทีพีซี": "Renew TPC", "พรรครีไลฟ์": "ReLife" };

const BUDGET_SOURCE_DOCUMENT = "48";
const CANTEEN_REPORT_DOCUMENT = "47";

interface BodySeed {
  slug: string;
  kind: OpenDataBodyKind;
  nameEn: string;
}

const COUNCIL_NAME_TH = "สภานักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์";
const COUNCIL: BodySeed = { slug: "council", kind: "council", nameEn: "Student Council, Tha Prachan" };

const BODIES: Record<string, BodySeed> = {
  "คณะกรรมการประสานงานร่วมสภา": { slug: "joint-coordinating-committee", kind: "committee", nameEn: "Joint coordinating committee" },
  "คณะกรรมาธิการการเมืองและส่งเสริมประชาธิปไตย": {
    slug: "politics-and-democracy-committee",
    kind: "committee",
    nameEn: "Politics and democracy committee",
  },
  "คณะกรรมาธิการกิจการสภาและองค์กรสัมพันธ์": {
    slug: "council-affairs-committee",
    kind: "committee",
    nameEn: "Council affairs and relations committee",
  },
  "คณะกรรมาธิการติดตามและตรวจสอบงบประมาณองค์การนักศึกษาและชุมนุม": {
    slug: "budget-monitoring-committee",
    kind: "committee",
    nameEn: "Budget monitoring and audit committee",
  },
  "คณะกรรมาธิการพิทักษ์สิทธิ สวัสดิการ และความเท่าเทียม": {
    slug: "rights-welfare-equality-committee",
    kind: "committee",
    nameEn: "Rights, welfare and equality committee",
  },
  "คณะกรรมาธิการวิสามัญพิจารณางบประมาณกิจกรรมนักศึกษา (รอบที่ 1)": {
    slug: "budget-review-round-1",
    kind: "committee",
    nameEn: "Ad hoc committee on the student activity budget, round 1",
  },
  "คณะกรรมาธิการวิสามัญพิจารณางบประมาณกิจกรรมนักศึกษา (รอบที่ 2)": {
    slug: "budget-review-round-2",
    kind: "committee",
    nameEn: "Ad hoc committee on the student activity budget, round 2",
  },
  "คณะกรรมาธิการวิสามัญเพื่อศึกษาและแก้ไขปัญหาเรื้อรังโรงอาหาร": {
    slug: "canteen-ad-hoc-committee",
    kind: "committee",
    nameEn: "Ad hoc committee on chronic canteen problems",
  },
  "อนุกรรมาธิการวิสามัญเพื่อศึกษาและแก้ไขปัญหาเรื้อรังโรงอาหาร": {
    slug: "canteen-sub-committee",
    kind: "committee",
    nameEn: "Ad hoc sub-committee on chronic canteen problems",
  },
  "สำนักประธานสภานักศึกษา": { slug: "president-office", kind: "office", nameEn: "Office of the President of the Council" },
  "ผู้ช่วยเลขาธิการสภานักศึกษา": {
    slug: "assistant-secretaries-general",
    kind: "office",
    nameEn: "Assistant secretaries-general of the Council",
  },
  "คณะกรรมการบริหารสภานักศึกษา ท่าพระจันทร์": {
    slug: "executive-committee",
    kind: "committee",
    nameEn: "Executive committee of the Council",
  },
  "คณะกรรมการบริหารสภานักศึกษามหาวิทยาลัยธรรมศาสตร์ (ทุกศูนย์)": {
    slug: "executive-committee-all-campuses",
    kind: "committee",
    nameEn: "Executive committee of the Student Councils (all campuses)",
  },
  "สำนักเลขาธิการ": { slug: "secretariat", kind: "office", nameEn: "Secretariat" },
};

export interface OpenDataImportCounts {
  documents: number;
  people: number;
  bodies: number;
  memberships: number;
  meetings: number;
  decisions: number;
  budgetLines: number;
  funds: number;
  recommendations: number;
  surveyResults: number;
}

interface ManifestEntry {
  n: string;
  drivePath: string;
  driveUrl: string;
  bytes: number;
  titleTh: string;
  titleEn: string;
  type: string;
  pages: string;
  scan: string;
}

type Row = Record<
  | "absent"
  | "addressed_to"
  | "amount_thb"
  | "annotation"
  | "appointed_on"
  | "body"
  | "category"
  | "chair"
  | "code"
  | "date"
  | "decision_en"
  | "decision_ref"
  | "decision_th"
  | "ended_on"
  | "fiscal_year_be"
  | "from"
  | "fund_type"
  | "item_printed"
  | "legal_basis"
  | "meeting_date"
  | "meeting_number"
  | "meeting_th"
  | "members_as_appointed"
  | "members_voting_printed"
  | "mentions"
  | "minutes_adopted_on"
  | "minutes_anchor"
  | "name"
  | "name_th"
  | "no"
  | "on_leave"
  | "organisation"
  | "organisation_type"
  | "outcome"
  | "parent"
  | "party_breakdown_printed"
  | "person"
  | "person_latin"
  | "faculty"
  | "party"
  | "place"
  | "present"
  | "problem_en"
  | "problem_th"
  | "project"
  | "recommendation_en"
  | "recommendation_th"
  | "remit"
  | "role"
  | "seats"
  | "section"
  | "session_number"
  | "session_type"
  | "source_document"
  | "source_documents"
  | "source_file"
  | "source_page"
  | "source_reference"
  | "status"
  | "status_date"
  | "to"
  | "topic"
  | "type"
  | "urgency"
  | "view"
  | "votes_abstain"
  | "votes_against"
  | "votes_for",
  string
>;
type Tx = AuditExecutor;

function chunks<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function stamp() {
  return { status: "published" as const, publishedAt: new Date() };
}

function csv(dir: string, name: string): Row[] {
  return parseCsv(readFileSync(`${dir}/tables/${name}`, "utf8")) as unknown as Row[];
}

/** Counts of rows each table gained. */
async function insertAll<T extends { id: unknown }>(
  rows: unknown[],
  insert: (batch: never[]) => Promise<T[]>,
): Promise<number> {
  let added = 0;
  for (const batch of chunks(rows)) added += (await insert(batch as never[])).length;
  return added;
}

function documentType(value: string): OpenDataDocumentType {
  if ((OPEN_DATA_DOCUMENT_TYPES as readonly string[]).includes(value)) return value as OpenDataDocumentType;
  return "other";
}

function folderOf(drivePath: string): { folder: string; file: string } {
  const at = drivePath.lastIndexOf("/");
  return at < 0 ? { folder: "", file: drivePath } : { folder: drivePath.slice(0, at), file: drivePath.slice(at + 1) };
}

function academicYear(isoDate: string): number {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  const month = Number.parseInt(isoDate.slice(5, 7), 10);
  return month >= 5 ? year + 543 : year + 542;
}

async function importDocuments(tx: Tx, dir: string): Promise<number> {
  const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8")) as ManifestEntry[];
  const values = manifest.map((entry) => {
    const { fields, body } = parseFrontMatter(readFileSync(`${dir}/transcripts/${entry.n}.md`, "utf8"));
    const titleEn = fields.title_en ?? entry.titleEn;
    const { folder, file } = folderOf(entry.drivePath);
    const pages = intOrNull(fields.pages) ?? intOrNull(entry.pages);
    const scan = (fields.scan ?? entry.scan) === "true";
    return {
      ...stamp(),
      owner: OWNER,
      number: entry.n,
      slug: `${entry.n}-${slugify(titleEn).slice(0, 60).replace(/-$/, "")}`,
      type: documentType(fields.type ?? entry.type),
      titleTh: fields.title_th ?? entry.titleTh,
      titleEn,
      issuerTh: textOrNull(fields.issuer_th),
      issuerEn: textOrNull(fields.issuer_en),
      reference: textOrNull(fields.reference),
      dateText: textOrNull(fields.date_be),
      dateIso: isoDateOrNull(fields.date_ce),
      signatory: textOrNull(fields.signed_by),
      pages,
      scan,
      driveFolderPath: folder,
      driveFileName: file,
      driveUrl: entry.driveUrl,
      fileBytes: entry.bytes,
      transcriptMarkdown: body,
    };
  });
  const added = await insertAll(values, (batch) =>
    tx.insert(openDataDocuments).values(batch).onConflictDoNothing().returning({ id: openDataDocuments.id }),
  );
  const docs = await documentIds(tx);
  for (const [from, to] of Object.entries(REPLACED_BY)) {
    const replaced = docs.get(from);
    const by = docs.get(to);
    if (replaced && by) {
      await tx
        .update(openDataDocuments)
        .set({ replacedById: by })
        .where(and(eq(openDataDocuments.id, replaced), isNull(openDataDocuments.replacedById)));
    }
  }
  return added;
}

async function documentIds(tx: Tx): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: openDataDocuments.id, number: openDataDocuments.number })
    .from(openDataDocuments)
    .where(eq(openDataDocuments.owner, OWNER));
  return new Map(rows.map((r) => [r.number, r.id]));
}

function firstDocumentNumber(printed: string): string | null {
  const first = printed.split(";")[0]?.trim() ?? "";
  return first && !isMarker(first) ? first : null;
}

function bodySeed(nameTh: string, index: number): BodySeed {
  return BODIES[nameTh] ?? { slug: `body-${index + 1}`, kind: "committee", nameEn: "" };
}

async function importBodies(tx: Tx, dir: string, docs: Map<string, string>): Promise<number> {
  const committees = csv(dir, "committees.csv");
  const people = csv(dir, "people-members-and-roles.csv");
  let added = 0;

  const [council] = await tx
    .insert(openDataBodies)
    .values({ ...stamp(), owner: OWNER, slug: COUNCIL.slug, kind: COUNCIL.kind, nameTh: COUNCIL_NAME_TH, nameEn: COUNCIL.nameEn })
    .onConflictDoNothing()
    .returning({ id: openDataBodies.id });
  if (council) added++;
  const [councilRow] = await tx
    .select({ id: openDataBodies.id })
    .from(openDataBodies)
    .where(and(eq(openDataBodies.owner, OWNER), eq(openDataBodies.slug, COUNCIL.slug)));
  const councilId = councilRow?.id ?? null;

  const names = new Set(committees.map((c) => c.name));
  const extras = [...new Set(people.map((p) => p.body))].filter((name) => !names.has(name));
  const committeeValues = committees.map((c, i) => {
    const seed = bodySeed(c.name, i);
    const sourceNumber = firstDocumentNumber(c.source_document);
    return {
      ...stamp(),
      owner: OWNER,
      slug: seed.slug,
      kind: c.type === "Office" || c.type === "Assistant secretaries-general" ? ("office" as const) : seed.kind,
      nameTh: c.name,
      nameEn: seed.nameEn || null,
      committeeType: textOrNull(c.type),
      parentId: c.parent === "Student Council, Tha Prachan" ? councilId : null,
      remit: textOrNull(c.remit),
      legalBasis: textOrNull(c.legal_basis),
      appointedOn: isoDateOrNull(c.appointed_on),
      endedOn: isoDateOrNull(c.ended_on),
      membersAsAppointed: intOrNull(c.members_as_appointed),
      chair: textOrNull(c.chair),
      activity: textOrNull(c.status),
      sourceDocumentId: sourceNumber ? (docs.get(sourceNumber) ?? null) : null,
    };
  });
  const extraValues = extras.map((name, i) => {
    const seed = bodySeed(name, names.size + i);
    return { ...stamp(), owner: OWNER, slug: seed.slug, kind: seed.kind, nameTh: name, nameEn: seed.nameEn || null };
  });
  added += await insertAll([...committeeValues, ...extraValues], (batch) =>
    tx.insert(openDataBodies).values(batch).onConflictDoNothing().returning({ id: openDataBodies.id }),
  );

  const rows = await tx.select().from(openDataBodies).where(eq(openDataBodies.owner, OWNER));
  const byName = new Map(rows.map((r) => [r.nameTh, r.id]));
  for (const c of committees) {
    if (c.parent === "Student Council, Tha Prachan") continue;
    const parentId = byName.get(c.parent);
    const id = byName.get(c.name);
    if (parentId && id) {
      await tx
        .update(openDataBodies)
        .set({ parentId })
        .where(and(eq(openDataBodies.id, id), isNull(openDataBodies.parentId)));
    }
  }
  return added;
}

async function importPeopleAndMemberships(
  tx: Tx,
  dir: string,
  docs: Map<string, string>,
): Promise<{ people: number; memberships: number }> {
  const rows = csv(dir, "people-members-and-roles.csv");
  const councilRows = csv(dir, "council-members.csv");
  const firstSeen = new Map<string, Row>();
  const pick = (name: string, key: "person_latin" | "faculty" | "party"): string => {
    const values = rows.filter((r) => r.person === name).map((r) => r[key]);
    return values.find((v) => !isMarker(v)) ?? values[0] ?? "";
  };
  for (const row of rows) if (!firstSeen.has(row.person)) firstSeen.set(row.person, row);

  const peopleValues: (typeof openDataPeople.$inferInsert)[] = [...firstSeen.keys()].map((name) => ({
    ...stamp(),
    owner: OWNER,
    nameTh: name,
    nameLatin: textOrNull(pick(name, "person_latin")),
    faculty: textOrNull(pick(name, "faculty")),
    party: textOrNull(pick(name, "party")),
  }));
  for (const r of councilRows) {
    if (firstSeen.has(r.name)) continue;
    firstSeen.set(r.name, r);
    peopleValues.push({
      ...stamp(),
      owner: OWNER,
      nameTh: r.name,
      faculty: textOrNull(r.faculty),
      party: textOrNull(PARTY_NAMES[r.party] ?? r.party),
    });
  }
  const people = await insertAll(peopleValues, (batch) =>
    tx.insert(openDataPeople).values(batch).onConflictDoNothing().returning({ id: openDataPeople.id }),
  );

  const personRows = await tx.select().from(openDataPeople).where(eq(openDataPeople.owner, OWNER));
  const bodyRows = await tx.select().from(openDataBodies).where(eq(openDataBodies.owner, OWNER));
  const personId = new Map(personRows.map((r) => [r.nameTh, r.id]));
  const bodyId = new Map(bodyRows.map((r) => [r.nameTh, r.id]));

  const membershipValues = rows.map((r) => {
    const number = firstDocumentNumber(r.source_documents);
    const pid = personId.get(r.person);
    const bid = bodyId.get(r.body);
    if (!pid || !bid) throw new Error(`Open data import: unknown person or body on row for ${r.person}`);
    return {
      ...stamp(),
      owner: OWNER,
      personId: pid,
      bodyId: bid,
      roleTh: r.role,
      fromDate: isoDateOrNull(r.from),
      toDate: isoDateOrNull(r.to),
      sourceDocumentId: number ? (docs.get(number) ?? null) : null,
      sourceDocuments: textOrNull(r.source_documents),
      sourceAnchor: textOrNull(r.source_reference),
    };
  });
  const councilId = bodyId.get(COUNCIL_NAME_TH);
  if (!councilId) throw new Error("Open data import: the council body is missing");
  for (const r of councilRows) {
    const pid = personId.get(r.name);
    if (!pid) throw new Error(`Open data import: unknown person ${r.name}`);
    membershipValues.push({
      ...stamp(),
      owner: OWNER,
      personId: pid,
      bodyId: councilId,
      roleTh: COUNCIL_MEMBER_ROLE,
      fromDate: COUNCIL_MEMBER_FROM,
      toDate: null,
      sourceDocumentId: docs.get(r.source_document) ?? null,
      sourceDocuments: textOrNull(r.source_document),
      sourceAnchor: textOrNull(r.source_reference),
    });
  }
  const memberships = await insertAll(membershipValues, (batch) =>
    tx.insert(openDataMemberships).values(batch).onConflictDoNothing().returning({ id: openDataMemberships.id }),
  );
  return { people, memberships };
}

async function importMeetingsAndDecisions(
  tx: Tx,
  dir: string,
  docs: Map<string, string>,
): Promise<{ meetings: number; decisions: number }> {
  const meetingRows = csv(dir, "meetings-attendance.csv");
  const decisionRows = csv(dir, "decisions.csv");

  const minutesNumberByDate = new Map<string, string>();
  for (const d of decisionRows) minutesNumberByDate.set(d.meeting_date, d.source_file.replace(/\.md$/, ""));

  const agendaRows = await tx
    .select({ id: openDataDocuments.id, dateIso: openDataDocuments.dateIso })
    .from(openDataDocuments)
    .where(and(eq(openDataDocuments.owner, OWNER), eq(openDataDocuments.type, "agenda")));

  const meetingValues = meetingRows.map((m) => {
    const sessionType = m.session_type as OpenDataSessionType;
    const minutesNumber = minutesNumberByDate.get(m.date);
    return {
      ...stamp(),
      owner: OWNER,
      slug: `${sessionType}-${m.session_number}-${m.meeting_number}`,
      sessionType,
      session: Number.parseInt(m.session_number, 10),
      meeting: Number.parseInt(m.meeting_number, 10),
      titleTh: m.meeting_th,
      academicYear: academicYear(m.date),
      meetingDate: m.date,
      place: textOrNull(m.place),
      chair: textOrNull(m.chair),
      seats: intOrNull(m.seats),
      present: intOrNull(m.present),
      onLeave: intOrNull(m.on_leave),
      absent: intOrNull(m.absent),
      minutesAdoptedOn: isoDateOrNull(m.minutes_adopted_on),
      minutesDocumentId: minutesNumber ? (docs.get(minutesNumber) ?? null) : null,
      agendaDocumentId: agendaRows.find((a) => a.dateIso === m.date)?.id ?? null,
    };
  });
  const meetings = await insertAll(meetingValues, (batch) =>
    tx.insert(openDataMeetings).values(batch).onConflictDoNothing().returning({ id: openDataMeetings.id }),
  );

  const meetingByDate = new Map(
    (await tx.select().from(openDataMeetings).where(eq(openDataMeetings.owner, OWNER))).map((r) => [r.meetingDate, r.id]),
  );
  const decisionValues = decisionRows.map((d) => {
    const meetingId = meetingByDate.get(d.meeting_date);
    if (!meetingId) throw new Error(`Open data import: no meeting on ${d.meeting_date} for ${d.decision_ref}`);
    return {
      ...stamp(),
      owner: OWNER,
      ref: d.decision_ref,
      meetingId,
      item: d.item_printed,
      topic: d.topic,
      type: d.type,
      textTh: d.decision_th,
      textEn: d.decision_en,
      votesFor: textOrNull(d.votes_for),
      votesAgainst: textOrNull(d.votes_against),
      votesAbstain: textOrNull(d.votes_abstain),
      membersVoting: textOrNull(d.members_voting_printed),
      partyBreakdown: textOrNull(d.party_breakdown_printed),
      outcome: d.outcome,
      amount: textOrNull(d.amount_thb),
      minutesAnchor: textOrNull(d.minutes_anchor),
    };
  });
  const decisions = await insertAll(decisionValues, (batch) =>
    tx.insert(openDataDecisions).values(batch).onConflictDoNothing().returning({ id: openDataDecisions.id }),
  );
  return { meetings, decisions };
}

async function importBudget(tx: Tx, dir: string, docs: Map<string, string>): Promise<number> {
  const sourceDocumentId = docs.get(BUDGET_SOURCE_DOCUMENT) ?? null;
  const values = csv(dir, "budget-lines.csv").map((r, i) => {
    if (!(OPEN_DATA_BUDGET_VIEWS as readonly string[]).includes(r.view)) {
      throw new Error(`Open data import: unknown budget view "${r.view}"`);
    }
    return {
      ...stamp(),
      owner: OWNER,
      fiscalYear: Number.parseInt(r.fiscal_year_be, 10),
      view: r.view as OpenDataBudgetView,
      organisationType: r.organisation_type,
      organisation: r.organisation,
      project: r.project,
      category: r.category,
      amount: r.amount_thb,
      sourceDocumentId,
      sourcePage: intOrNull(r.source_page),
      position: i + 1,
    };
  });
  return insertAll(values, (batch) =>
    tx.insert(openDataBudgetLines).values(batch).onConflictDoNothing().returning({ id: openDataBudgetLines.id }),
  );
}

async function importFunds(tx: Tx, dir: string): Promise<number> {
  const values = csv(dir, "university-funds.csv").map((r) => ({
    ...stamp(),
    owner: OWNER,
    number: Number.parseInt(r.no, 10),
    type: r.fund_type,
    code: r.code,
    name: r.name_th,
    annotation: textOrNull(r.annotation),
  }));
  return insertAll(values, (batch) =>
    tx.insert(openDataFunds).values(batch).onConflictDoNothing().returning({ id: openDataFunds.id }),
  );
}

async function importReport(
  tx: Tx,
  dir: string,
  docs: Map<string, string>,
): Promise<{ recommendations: number; surveyResults: number }> {
  const reportDocumentId = docs.get(CANTEEN_REPORT_DOCUMENT);
  if (!reportDocumentId) throw new Error(`Open data import: document ${CANTEEN_REPORT_DOCUMENT} is missing`);
  const recommendationValues = csv(dir, "canteen-recommendations.csv").map((r, i) => ({
    ...stamp(),
    owner: OWNER,
    reportDocumentId,
    section: r.section,
    textTh: r.recommendation_th,
    textEn: r.recommendation_en,
    addressedTo: textOrNull(r.addressed_to),
    urgency: textOrNull(r.urgency),
    responseStatus: textOrNull(r.status),
    responseDate: textOrNull(r.status_date),
    position: i + 1,
  }));
  const recommendations = await insertAll(recommendationValues, (batch) =>
    tx.insert(openDataRecommendations).values(batch).onConflictDoNothing().returning({ id: openDataRecommendations.id }),
  );
  const surveyValues = csv(dir, "canteen-survey.csv").map((r) => ({
    ...stamp(),
    owner: OWNER,
    reportDocumentId,
    problemTh: r.problem_th,
    problemEn: r.problem_en,
    mentions: Number.parseInt(r.mentions, 10),
  }));
  const surveyResults = await insertAll(surveyValues, (batch) =>
    tx.insert(openDataSurveyResults).values(batch).onConflictDoNothing().returning({ id: openDataSurveyResults.id }),
  );
  return { recommendations, surveyResults };
}

/**
 * Imports every document and dataset, in dependency order, in one
 * transaction. Returns how many rows each table gained: all zero on a re-run.
 */
export async function importOpenData(db: AuditExecutor, dir: string = OPEN_DATA_DIR): Promise<OpenDataImportCounts> {
  return db.transaction(async (tx) => {
    const documents = await importDocuments(tx, dir);
    const docs = await documentIds(tx);
    const bodies = await importBodies(tx, dir, docs);
    const { people, memberships } = await importPeopleAndMemberships(tx, dir, docs);
    const { meetings, decisions } = await importMeetingsAndDecisions(tx, dir, docs);
    const budgetLines = await importBudget(tx, dir, docs);
    const funds = await importFunds(tx, dir);
    const { recommendations, surveyResults } = await importReport(tx, dir, docs);
    return { documents, people, bodies, memberships, meetings, decisions, budgetLines, funds, recommendations, surveyResults };
  });
}
