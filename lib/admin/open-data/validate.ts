import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import {
  OPEN_DATA_BUDGET_VIEWS,
  OPEN_DATA_DOCUMENT_TYPES,
  OPEN_DATA_OWNERS,
  OPEN_DATA_SESSION_TYPES,
  type OpenDataOwner,
} from "@/lib/db/schema/content/open-data";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { canEditOwner } from "./scope";

/**
 * Form validation for the open data editors. Pure: no database, no session,
 * so tests run it directly. Text keeps what was typed (trimmed at the ends
 * only); a transcript is kept exactly, apart from line endings.
 */

export const MAX_TRANSCRIPT_CHARS = 1_000_000;
export const FISCAL_YEAR_MIN = 2400;
export const FISCAL_YEAR_MAX = 2700;
export const DOCUMENT_NUMBER = /^\d{2,3}$/;
const AMOUNT = /^-?\d{1,12}(\.\d{1,2})?$/;

export type Checked<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/** An amount as printed on a budget line ("1,234.5" or "1234.50") as the two decimal place string the column stores, or null when it is not an amount. */
export function normaliseAmount(raw: string): string | null {
  const text = raw.trim().replace(/,/g, "");
  if (!AMOUNT.test(text)) return null;
  const negative = text.startsWith("-");
  const [whole = "0", fraction = ""] = text.replace("-", "").split(".");
  const value = `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
  return negative && /[1-9]/.test(value) ? `-${value}` : value;
}

/** The Thai academic year (Buddhist era) a date falls in; a year starts in May. */
export function academicYearOf(isoDate: string): number {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  const month = Number.parseInt(isoDate.slice(5, 7), 10);
  return month >= 5 ? year + 543 : year + 542;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

function ownerField(locale: Locale, formData: FormData, owners: readonly OpenDataOwner[], errors: FieldErrors): OpenDataOwner | null {
  const raw = asString(formData.get("owner")).trim();
  if (!raw || !(OPEN_DATA_OWNERS as readonly string[]).includes(raw)) {
    errors.owner = a("errSelectField", locale, { field: a("fieldOwner", locale).toLowerCase() });
    return null;
  }
  if (!canEditOwner(owners, raw)) {
    errors.owner = a("odmErrScope", locale);
    return null;
  }
  return raw as OpenDataOwner;
}

function finish<T>(parsed: { ok: true; data: T } | { ok: false; errors: FieldErrors }, errors: FieldErrors): Checked<T> {
  if (!parsed.ok) return { ok: false, errors: { ...parsed.errors, ...errors } };
  return Object.keys(errors).length > 0 ? { ok: false, errors } : parsed;
}

export interface DocumentInput {
  locale: Locale;
  formData: FormData;
  /** Rows already saved keep their body; a new one takes it from the form. */
  existingOwner?: OpenDataOwner;
  existingStatus?: ContentStatus;
  owners: readonly OpenDataOwner[];
}

export function validateDocumentForm(input: DocumentInput) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const k = fieldKit(locale, resolved.publishing);
  const errors: FieldErrors = {};

  const owner = input.existingOwner ?? ownerField(locale, formData, input.owners, errors);
  if (input.existingOwner && !canEditOwner(input.owners, input.existingOwner)) errors.owner = L("odmErrScope");

  const schema = z.object({
    number: z.preprocess((v) => asString(v).trim(), z.string()).superRefine((value, ctx) => {
      if (!DOCUMENT_NUMBER.test(value)) ctx.addIssue({ code: "custom", message: L("odmErrNumber") });
    }),
    slug: k.slug(L("fieldSlug")),
    type: k.enumOf(L("odmFieldType"), OPEN_DATA_DOCUMENT_TYPES),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 400 }),
    issuer: k.bilingual(L("odmFieldIssuer"), { max: 400 }),
    reference: k.nullableText(L("odmFieldReference"), { max: 200 }),
    dateText: k.nullableText(L("odmFieldDateText"), { max: 200 }),
    dateIso: k.date(L("odmFieldDateIso")),
    signatory: k.nullableText(L("odmFieldSignatory"), { max: 300 }),
    pages: k.integer(L("odmFieldPages"), { min: 0, max: 100000 }),
    scan: k.checkbox(),
    driveUrl: k.url(L("odmFieldDriveUrl")),
    replacedBy: k.reference(L("odmFieldReplacedBy")),
    removeFile: k.checkbox(),
  });
  const parsed = parseForm(schema, formDataToObject(formData));

  const transcript = asString(formData.get("transcript")).replace(/\r\n?/g, "\n");
  if (transcript.length > MAX_TRANSCRIPT_CHARS) errors.transcript = a("errFieldTooLong", locale, { field: L("odmFieldTranscript").toLowerCase(), max: MAX_TRANSCRIPT_CHARS });

  const checked = finish(parsed, errors);
  if (!checked.ok || !owner) return { ok: false as const, errors: checked.ok ? errors : checked.errors };
  return { ok: true as const, data: { ...checked.data, owner, transcript }, ...resolved };
}

export interface RowInput {
  locale: Locale;
  formData: FormData;
}

export function validateMeetingForm(input: RowInput & { existingOwner?: OpenDataOwner; owners: readonly OpenDataOwner[] }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, false);
  const errors: FieldErrors = {};
  const owner = input.existingOwner ?? ownerField(locale, formData, input.owners, errors);
  if (input.existingOwner && !canEditOwner(input.owners, input.existingOwner)) errors.owner = L("odmErrScope");

  const count = (key: AdminKey) => k.integer(L(key), { min: 0, max: 10000 });
  const schema = z.object({
    sessionType: k.enumOf(L("odmFieldSessionType"), OPEN_DATA_SESSION_TYPES),
    session: k.integer(L("odmFieldSession"), { min: 1, max: 999, required: true }),
    meeting: k.integer(L("odmFieldMeeting"), { min: 1, max: 999, required: true }),
    titleTh: k.text(L("odmFieldMeetingTitle"), { max: 400 }),
    meetingDate: k.date(L("odmFieldMeetingDate"), { required: true }),
    academicYear: k.integer(L("odmFieldAcademicYear"), { min: FISCAL_YEAR_MIN, max: FISCAL_YEAR_MAX }),
    place: k.nullableText(L("odmFieldPlace"), { max: 300 }),
    chair: k.nullableText(L("odmFieldChair"), { max: 300 }),
    seats: count("odmFieldSeats"),
    present: count("odmFieldPresent"),
    onLeave: count("odmFieldOnLeave"),
    absent: count("odmFieldAbsent"),
    minutesAdoptedOn: k.date(L("odmFieldMinutesAdoptedOn")),
    minutesDocument: k.reference(L("odmFieldMinutesDocument")),
    agendaDocument: k.reference(L("odmFieldAgendaDocument")),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  const checked = finish(parsed, errors);
  if (!checked.ok || !owner) return { ok: false as const, errors: checked.ok ? errors : checked.errors };
  const data = checked.data;
  return {
    ok: true as const,
    data: { ...data, owner, academicYear: data.academicYear ?? academicYearOf(data.meetingDate!) },
  };
}

export function validateDecisionForm(input: RowInput) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, false);
  const schema = z.object({
    ref: k.text(L("odmFieldRef"), { required: true, max: 40 }),
    item: k.text(L("odmFieldItem"), { required: true, max: 200 }),
    topic: k.text(L("odmFieldTopic"), { required: true, max: 300 }),
    type: k.text(L("odmFieldDecisionType"), { required: true, max: 200 }),
    text: k.bilingual(L("odmFieldDecisionText"), { max: 10000 }),
    votesFor: k.nullableText(L("odmFieldVotesFor"), { max: 100 }),
    votesAgainst: k.nullableText(L("odmFieldVotesAgainst"), { max: 100 }),
    votesAbstain: k.nullableText(L("odmFieldVotesAbstain"), { max: 100 }),
    membersVoting: k.nullableText(L("odmFieldMembersVoting"), { max: 100 }),
    partyBreakdown: k.nullableText(L("odmFieldPartyBreakdown"), { max: 1000 }),
    outcome: k.text(L("odmFieldOutcome"), { required: true, max: 200 }),
    amount: k.nullableText(L("odmFieldAmount"), { max: 200 }),
    minutesAnchor: k.nullableText(L("odmFieldMinutesAnchor"), { max: 300 }),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return parsed;
  const { text, ...rest } = parsed.data;
  return { ok: true as const, data: { ...rest, textTh: text.th, textEn: text.en } };
}

export function validateBudgetLineForm(input: RowInput & { existingOwner?: OpenDataOwner; owners: readonly OpenDataOwner[] }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, false);
  const errors: FieldErrors = {};
  const owner = input.existingOwner ?? ownerField(locale, formData, input.owners, errors);
  if (input.existingOwner && !canEditOwner(input.owners, input.existingOwner)) errors.owner = L("odmErrScope");

  const schema = z.object({
    fiscalYear: k.integer(L("odmFieldFiscalYear"), { min: FISCAL_YEAR_MIN, max: FISCAL_YEAR_MAX, required: true }),
    view: k.enumOf(L("odmFieldView"), OPEN_DATA_BUDGET_VIEWS),
    organisationType: k.text(L("odmFieldOrganisationType"), { required: true, max: 300 }),
    organisation: k.text(L("odmFieldOrganisation"), { required: true, max: 300 }),
    project: k.text(L("odmFieldProject"), { required: true, max: 500 }),
    category: k.text(L("odmFieldCategory"), { required: true, max: 500 }),
    amount: z.preprocess((v) => asString(v), z.string()).transform((value, ctx): string => {
      const amount = normaliseAmount(value);
      if (amount === null) {
        ctx.addIssue({ code: "custom", message: L("odmErrAmount") });
        return z.NEVER;
      }
      return amount;
    }),
    sourceDocument: k.reference(L("odmFieldSourceDocument")),
    sourcePage: k.integer(L("odmFieldSourcePage"), { min: 0, max: 100000 }),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  const checked = finish(parsed, errors);
  if (!checked.ok || !owner) return { ok: false as const, errors: checked.ok ? errors : checked.errors };
  return { ok: true as const, data: { ...checked.data, owner } };
}

export function validateFundForm(input: RowInput & { existingOwner?: OpenDataOwner; owners: readonly OpenDataOwner[] }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, false);
  const errors: FieldErrors = {};
  const owner = input.existingOwner ?? ownerField(locale, formData, input.owners, errors);
  if (input.existingOwner && !canEditOwner(input.owners, input.existingOwner)) errors.owner = L("odmErrScope");

  const schema = z.object({
    number: k.integer(L("odmFieldFundNumber"), { min: 1, max: 100000, required: true }),
    type: k.text(L("odmFieldFundType"), { required: true, max: 500 }),
    code: k.text(L("odmFieldFundCode"), { required: true, max: 100 }),
    name: k.text(L("odmFieldFundName"), { required: true, max: 500 }),
    annotation: k.nullableText(L("odmFieldAnnotation"), { max: 1000 }),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  const checked = finish(parsed, errors);
  if (!checked.ok || !owner) return { ok: false as const, errors: checked.ok ? errors : checked.errors };
  return { ok: true as const, data: { ...checked.data, owner } };
}
