"use server";

import { and, eq, inArray, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState, type FieldErrors } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { openDataActor, requireOpenDataEditor } from "@/lib/admin/open-data/access";
import type { CsvFailure } from "@/lib/admin/open-data/csv-import";
import { discardStoredFile, storeDocumentFile } from "@/lib/admin/open-data/files";
import { importBudgetCsv, importFundsCsv } from "@/lib/admin/open-data/import";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import {
  validateBudgetLineForm,
  validateDecisionForm,
  validateDocumentForm,
  validateFundForm,
  validateMeetingForm,
} from "@/lib/admin/open-data/validate";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  openDataBudgetLines,
  openDataDecisions,
  openDataDocuments,
  openDataFunds,
  openDataMeetings,
  type OpenDataOwner,
} from "@/lib/db/schema/content/open-data";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { validateUpload } from "@/lib/storage";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";

const BASE = OPEN_DATA_PATHS.documents;

const notFound = (locale: Locale): ContentFormState => ({ errors: {}, formError: a("errNotFound", locale) });
const outOfScope = (locale: Locale): ContentFormState => ({ errors: {}, formError: a("odmErrScope", locale) });

/** The ids in `ids` that are not documents of `owner`. */
async function foreignDocuments(db: AuditExecutor, owner: OpenDataOwner, ids: readonly (string | null)[]): Promise<Set<string>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Set();
  const rows = await db
    .select({ id: openDataDocuments.id })
    .from(openDataDocuments)
    .where(and(eq(openDataDocuments.owner, owner), inArray(openDataDocuments.id, wanted)));
  const found = new Set(rows.map((r) => r.id));
  return new Set(wanted.filter((id) => !found.has(id)));
}

/** Create (id null) or update a document. Bound with `.bind(null, id)`. */
export async function saveDocument(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();
  const db = getDb();
  const L = (key: AdminKey) => a(key, locale);

  if (id !== null && !isUuid(id)) return notFound(locale);
  const [existing] = id ? await db.select().from(openDataDocuments).where(eq(openDataDocuments.id, id)) : [];
  if (id && !existing) return notFound(locale);
  if (existing && !canEditOwner(owners, existing.owner)) return outOfScope(locale);

  const checked = validateDocumentForm({ locale, formData, owners, existingOwner: existing?.owner as OpenDataOwner | undefined, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { data, status } = checked;
  const { owner } = data;

  const errors: FieldErrors = {};
  if (data.replacedBy) {
    if (data.replacedBy === id || (await foreignDocuments(db, owner, [data.replacedBy])).size > 0) errors.replacedBy = a("errSelectField", locale, { field: L("odmFieldReplacedBy").toLowerCase() });
  }

  const file = formData.get("file");
  let fileValues: Record<string, unknown> = {};
  let uploadedKey: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (Object.keys(errors).length === 0) {
      const stored = await storeDocumentFile({ file, owner, locale });
      if (!stored.ok) errors.file = stored.error;
      else {
        uploadedKey = stored.key;
        fileValues = { fileKey: stored.key, fileUrl: stored.url, fileBytes: stored.bytes, fileContentType: stored.contentType };
      }
    }
  } else if (data.removeFile) {
    fileValues = { fileKey: null, fileUrl: null, fileBytes: null, fileContentType: null };
  }
  if (Object.keys(errors).length > 0) return { ...EMPTY_FORM_STATE, errors };

  let saved;
  try {
    saved = await saveContent({
      entityType: "openDataDocument",
      table: openDataDocuments,
      actor: await openDataActor(staff, owner),
      id: id ?? undefined,
      status,
      values: {
        owner,
        number: data.number,
        slug: data.slug,
        type: data.type,
        titleTh: data.title.th,
        titleEn: data.title.en,
        issuerTh: data.issuer.th || null,
        issuerEn: data.issuer.en || null,
        reference: data.reference,
        dateText: data.dateText,
        dateIso: data.dateIso,
        signatory: data.signatory,
        pages: data.pages,
        scan: data.scan,
        driveUrl: data.driveUrl ?? "",
        replacedById: data.replacedBy,
        transcriptMarkdown: data.transcript,
        ...fileValues,
      },
    });
  } catch (error) {
    await discardStoredFile(uploadedKey);
    if (error instanceof ContentConflictError) {
      return error.constraint?.includes("number") ? { errors: { number: L("odmErrNumberTaken") } } : { errors: { slug: L("errSlugTaken") } };
    }
    if (error instanceof ContentNotFoundError) return notFound(locale);
    throw error;
  }
  if (existing?.fileKey && "fileKey" in fileValues) await discardStoredFile(existing.fileKey);

  const intent = checked.intent;
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${BASE}/${saved.id}?saved=${notice}`);
}

/** Create (id null) or update a meeting. */
export async function saveMeeting(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();
  const db = getDb();

  if (id !== null && !isUuid(id)) return notFound(locale);
  const [existing] = id ? await db.select().from(openDataMeetings).where(eq(openDataMeetings.id, id)) : [];
  if (id && !existing) return notFound(locale);
  if (existing && !canEditOwner(owners, existing.owner)) return outOfScope(locale);

  const checked = validateMeetingForm({ locale, formData, owners, existingOwner: existing?.owner as OpenDataOwner | undefined });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { data } = checked;
  const { owner } = data;

  const errors: FieldErrors = {};
  const foreign = await foreignDocuments(db, owner, [data.minutesDocument, data.agendaDocument]);
  if (data.minutesDocument && foreign.has(data.minutesDocument)) errors.minutesDocument = a("errSelectField", locale, { field: a("odmFieldMinutesDocument", locale).toLowerCase() });
  if (data.agendaDocument && foreign.has(data.agendaDocument)) errors.agendaDocument = a("errSelectField", locale, { field: a("odmFieldAgendaDocument", locale).toLowerCase() });
  if (Object.keys(errors).length > 0) return { ...EMPTY_FORM_STATE, errors };

  let saved;
  try {
    saved = await saveContent({
      entityType: "openDataMeeting",
      table: openDataMeetings,
      actor: await openDataActor(staff, owner),
      id: id ?? undefined,
      status: "published",
      values: {
        owner,
        ...(existing ? {} : { slug: `${data.sessionType}-${data.session}-${data.meeting}` }),
        sessionType: data.sessionType,
        session: data.session,
        meeting: data.meeting,
        titleTh: data.titleTh,
        academicYear: data.academicYear,
        meetingDate: data.meetingDate,
        place: data.place,
        chair: data.chair,
        seats: data.seats,
        present: data.present,
        onLeave: data.onLeave,
        absent: data.absent,
        minutesAdoptedOn: data.minutesAdoptedOn,
        minutesDocumentId: data.minutesDocument,
        agendaDocumentId: data.agendaDocument,
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { meeting: a("odmErrMeetingTaken", locale) } };
    if (error instanceof ContentNotFoundError) return notFound(locale);
    throw error;
  }
  redirect(`${OPEN_DATA_PATHS.meetings}/${saved.id}?saved=updated`);
}

/** Create (id null) or update a decision of `meetingId`. Bound with `.bind(null, meetingId, id)`. */
export async function saveDecision(meetingId: string, id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();
  const db = getDb();

  if (!isUuid(meetingId) || (id !== null && !isUuid(id))) return notFound(locale);
  const [meeting] = await db.select({ id: openDataMeetings.id, owner: openDataMeetings.owner }).from(openDataMeetings).where(eq(openDataMeetings.id, meetingId));
  if (!meeting) return notFound(locale);
  if (!canEditOwner(owners, meeting.owner)) return outOfScope(locale);
  if (id) {
    const [existing] = await db.select({ id: openDataDecisions.id }).from(openDataDecisions).where(and(eq(openDataDecisions.id, id), eq(openDataDecisions.meetingId, meetingId)));
    if (!existing) return notFound(locale);
  }

  const checked = validateDecisionForm({ locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const d = checked.data;

  let saved;
  try {
    saved = await saveContent({
      entityType: "openDataMeeting",
      table: openDataDecisions,
      actor: await openDataActor(staff, meeting.owner),
      id: id ?? undefined,
      status: "published",
      values: { owner: meeting.owner, meetingId, ...d },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { ref: a("odmErrRefTaken", locale) } };
    if (error instanceof ContentNotFoundError) return notFound(locale);
    throw error;
  }
  redirect(`${OPEN_DATA_PATHS.meetings}/${meetingId}/decisions/${saved.id}?saved=updated`);
}

/** Deletes a decision and returns to its meeting. Bound with `.bind(null, meetingId, id)`. */
export async function deleteDecision(meetingId: string, id: string): Promise<void> {
  const { staff, owners } = await requireOpenDataEditor();
  if (!isUuid(meetingId) || !isUuid(id)) redirect(OPEN_DATA_PATHS.meetings);
  const [row] = await getDb().select({ owner: openDataDecisions.owner }).from(openDataDecisions).where(eq(openDataDecisions.id, id));
  if (row && canEditOwner(owners, row.owner)) {
    try {
      await deleteContent({ entityType: "openDataMeeting", table: openDataDecisions, actor: await openDataActor(staff, row.owner), id });
    } catch (error) {
      if (!(error instanceof ContentNotFoundError)) throw error;
    }
  }
  redirect(`${OPEN_DATA_PATHS.meetings}/${meetingId}?notice=deleted`);
}

/** Create (id null) or update a budget line. */
export async function saveBudgetLine(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();
  const db = getDb();

  if (id !== null && !isUuid(id)) return notFound(locale);
  const [existing] = id ? await db.select().from(openDataBudgetLines).where(eq(openDataBudgetLines.id, id)) : [];
  if (id && !existing) return notFound(locale);
  if (existing && !canEditOwner(owners, existing.owner)) return outOfScope(locale);

  const checked = validateBudgetLineForm({ locale, formData, owners, existingOwner: existing?.owner as OpenDataOwner | undefined });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { sourceDocument, ...data } = checked.data;
  const { owner } = data;

  if (sourceDocument && (await foreignDocuments(db, owner, [sourceDocument])).size > 0) {
    return { errors: { sourceDocument: a("errSelectField", locale, { field: a("odmFieldSourceDocument", locale).toLowerCase() }) } };
  }
  let position = existing?.position;
  if (position === undefined) {
    const [top] = await db
      .select({ top: max(openDataBudgetLines.position) })
      .from(openDataBudgetLines)
      .where(and(eq(openDataBudgetLines.owner, owner), eq(openDataBudgetLines.fiscalYear, data.fiscalYear!)));
    position = (top?.top ?? 0) + 1;
  }

  let saved;
  try {
    saved = await saveContent({
      entityType: "openDataBudget",
      table: openDataBudgetLines,
      actor: await openDataActor(staff, owner),
      id: id ?? undefined,
      status: "published",
      values: { ...data, sourceDocumentId: sourceDocument, position },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { organisation: a("odmErrLineTaken", locale) } };
    if (error instanceof ContentNotFoundError) return notFound(locale);
    throw error;
  }
  redirect(`${OPEN_DATA_PATHS.budget}/${saved.id}?saved=updated`);
}

export async function deleteBudgetLine(id: string): Promise<void> {
  const { staff, owners } = await requireOpenDataEditor();
  if (!isUuid(id)) redirect(OPEN_DATA_PATHS.budget);
  const [row] = await getDb().select({ owner: openDataBudgetLines.owner }).from(openDataBudgetLines).where(eq(openDataBudgetLines.id, id));
  if (row && canEditOwner(owners, row.owner)) {
    try {
      await deleteContent({ entityType: "openDataBudget", table: openDataBudgetLines, actor: await openDataActor(staff, row.owner), id });
    } catch (error) {
      if (!(error instanceof ContentNotFoundError)) throw error;
    }
  }
  redirect(`${OPEN_DATA_PATHS.budget}?notice=deleted`);
}

/** Create (id null) or update a university fund. */
export async function saveFund(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();
  const db = getDb();

  if (id !== null && !isUuid(id)) return notFound(locale);
  const [existing] = id ? await db.select().from(openDataFunds).where(eq(openDataFunds.id, id)) : [];
  if (id && !existing) return notFound(locale);
  if (existing && !canEditOwner(owners, existing.owner)) return outOfScope(locale);

  const checked = validateFundForm({ locale, formData, owners, existingOwner: existing?.owner as OpenDataOwner | undefined });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { data } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "openDataFund",
      table: openDataFunds,
      actor: await openDataActor(staff, data.owner),
      id: id ?? undefined,
      status: "published",
      values: { ...data },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { number: a("odmErrFundTaken", locale) } };
    if (error instanceof ContentNotFoundError) return notFound(locale);
    throw error;
  }
  redirect(`${OPEN_DATA_PATHS.funds}/${saved.id}?saved=updated`);
}

export async function deleteFund(id: string): Promise<void> {
  const { staff, owners } = await requireOpenDataEditor();
  if (!isUuid(id)) redirect(OPEN_DATA_PATHS.funds);
  const [row] = await getDb().select({ owner: openDataFunds.owner }).from(openDataFunds).where(eq(openDataFunds.id, id));
  if (row && canEditOwner(owners, row.owner)) {
    try {
      await deleteContent({ entityType: "openDataFund", table: openDataFunds, actor: await openDataActor(staff, row.owner), id });
    } catch (error) {
      if (!(error instanceof ContentNotFoundError)) throw error;
    }
  }
  redirect(`${OPEN_DATA_PATHS.funds}?notice=deleted`);
}

export type CsvImportKind = "budget" | "funds";

/** What the import form shows afterwards. Plain data, so it can cross to the client. */
export interface CsvImportState {
  done?: { kind: CsvImportKind; created: number; updated: number; unchanged: number; total: number };
  failure?: CsvFailure | { ok: false; reason: "source" };
  /** A problem with the file or the form, in words. */
  error?: string;
}

/** Imports a budget line or fund CSV: every row is checked first and nothing is written unless all pass. Bound with `.bind(null, kind)`. */
export async function importCsv(kind: CsvImportKind, _prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const locale = await getAdminLocale();
  const { staff, owners } = await requireOpenDataEditor();

  const owner = String(formData.get("owner") ?? "");
  if (!canEditOwner(owners, owner)) return { error: a("odmErrScope", locale) };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: a("odmErrCsvChoose", locale) };
  if (file.size > ADMIN_UPLOAD_MAX_BYTES) return { error: a("odmErrFileTooLarge", locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 }) };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(bytes, "document");
  if (!check.ok || check.contentType !== "text/csv") return { error: a("odmErrCsvType", locale) };
  const text = new TextDecoder("utf-8").decode(bytes);

  const actor = await openDataActor(staff, owner);
  const outcome =
    kind === "budget"
      ? await importBudgetCsv({ actor, owner, text, sourceDocumentNumber: String(formData.get("sourceDocument") ?? "") })
      : await importFundsCsv({ actor, owner, text });
  if (!outcome.ok) return { failure: outcome };
  const { created, updated, unchanged, total } = outcome;
  return { done: { kind, created, updated, unchanged, total } };
}
