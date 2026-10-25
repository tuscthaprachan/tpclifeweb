/**
 * Reads and checks the staff lost and found forms. Pure functions of the
 * posted `FormData`, so every rule can be tested without a database. Messages
 * are in the staff member's language and say what to do (GOV.UK error message
 * guidance). Validation happens here on the server, always; the forms add
 * nothing the server does not enforce.
 */

import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { CASE_PREFERRED_CONTACTS } from "@/lib/db/schema/cases";
import { LOST_FOUND_CATEGORIES } from "@/lib/db/schema/content/enums";
import { ID_CHECK_TYPES } from "@/lib/db/schema/lost-found-staff";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { ANSWER_MAX } from "./claims";
import type { ItemDescription, WalkInLost } from "./intake";

export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Item description: category, title and description in either language, where and when. */
export function parseDescription(formData: FormData, locale: Locale, now: Date = new Date()): Parsed<ItemDescription> {
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, false);
  const schema = z.object({
    category: k.enumOf(L("fieldCategory"), LOST_FOUND_CATEGORIES),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    description: k.bilingual(L("lfFieldDescription"), { required: true, max: 2000 }),
    placeId: k.reference(L("lfFieldPlace")),
    locationNote: k.bilingual(L("lfFieldLocationNote"), { max: 300 }),
    occurredOn: k.date(L("lfFieldOccurredOn"), { required: true }),
  });
  const raw = formDataToObject(formData);
  const parsed = parseForm(schema, raw);
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
  // Checked on what was posted, so every problem shows at once rather than one after another.
  const posted = (path: string[]): string => {
    let node: unknown = raw;
    for (const part of path) node = typeof node === "object" && node !== null ? (node as Record<string, unknown>)[part] : undefined;
    return typeof node === "string" ? node.trim() : "";
  };
  if (!posted(["placeId"]) && !posted(["locationNote", "th"]) && !posted(["locationNote", "en"])) errors.placeId = L("lfErrLocation");
  if (parsed.ok && parsed.data.occurredOn && parsed.data.occurredOn > bangkokDateKey(now)) errors.occurredOn = a("lfcErrDateFuture", locale);
  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false, errors };
  const d = parsed.data;
  return {
    ok: true,
    data: { category: d.category!, title: d.title, description: d.description, placeId: d.placeId, locationNote: d.locationNote, occurredOn: d.occurredOn! },
  };
}

/** The person's details for a walk-in lost report. */
export function parseWalkIn(formData: FormData, locale: Locale, now: Date = new Date()): Parsed<WalkInLost> {
  const described = parseDescription(formData, locale, now);
  const k = fieldKit(locale, false);
  const schema = z.object({
    locale: k.enumOf(a("lfcFieldLanguage", locale), ["th", "en"] as const),
    name: k.text(a("lfcFieldName", locale), { required: true, max: 200 }),
    email: k.text(a("contactEmail", locale), { max: 320 }),
    phone: k.text(a("contactPhone", locale), { max: 40 }),
    lineId: k.text(a("contactLine", locale), { max: 100 }),
    preferred: k.enumOf(a("contactPreferred", locale), CASE_PREFERRED_CONTACTS, { required: false }),
    consentContact: k.checkbox(),
    consentShare: k.checkbox(),
  });
  const raw = formDataToObject(formData);
  const person = parseForm(schema, { ...(raw.contact as object | undefined), locale: raw.language });
  const errors: FieldErrors = {};
  if (!described.ok) Object.assign(errors, described.errors);
  if (!person.ok) for (const [key, message] of Object.entries(person.errors)) errors[`contact.${key}`] = message;
  const contact = (raw.contact ?? {}) as Record<string, unknown>;
  const given = (key: string) => (typeof contact[key] === "string" ? (contact[key] as string).trim() : "");
  if (!given("email") && !given("phone") && !given("lineId")) errors["contact.email"] = a("lfcErrContactMethod", locale);
  else if (given("email") && !EMAIL.test(given("email"))) errors["contact.email"] = a("errEmailFormat", locale);
  const preferredField = { email: "email", phone: "phone", line: "lineId" } as const;
  const preferred = given("preferred") as keyof typeof preferredField;
  if (preferred in preferredField && !given(preferredField[preferred])) errors["contact.preferred"] = a("lfcErrPreferredMissing", locale);
  if (Object.keys(errors).length > 0 || !described.ok || !person.ok) return { ok: false, errors };
  const p = person.data;
  return {
    ok: true,
    data: {
      ...described.data,
      locale: p.locale ?? "th",
      contact: {
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        lineId: p.lineId || null,
        preferredContact: p.preferred,
        consentContact: p.consentContact,
        consentShare: p.consentShare,
      },
    },
  };
}

export interface StorageInput {
  organisationId: number;
  shelf: string;
}

export function parseStorage(formData: FormData, locale: Locale): Parsed<StorageInput> {
  const k = fieldKit(locale, false);
  const schema = z.object({
    organisationId: k.integer(a("lfcFieldDesk", locale), { min: 1, required: true }),
    shelf: k.text(a("lfcFieldShelf", locale), { required: true, max: 120 }),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return parsed;
  return { ok: true, data: { organisationId: parsed.data.organisationId!, shelf: parsed.data.shelf } };
}

export function parseVerification(formData: FormData, locale: Locale): Parsed<{ detail: string }> {
  const k = fieldKit(locale, false);
  const parsed = parseForm(z.object({ detail: k.text(a("lfcFieldVerification", locale), { required: true, max: 2000 }) }), formDataToObject(formData));
  return parsed.ok ? { ok: true, data: { detail: parsed.data.detail } } : parsed;
}

export interface ContactFields {
  name: string | null;
  email: string | null;
  phone: string | null;
  lineId: string | null;
  preferredContact: (typeof CASE_PREFERRED_CONTACTS)[number] | null;
  consentContact: boolean;
}

/** A person's contact details: the finder (optional) or a claimant. At least one detail, and a valid email address if given. */
export function parseContactFields(formData: FormData, locale: Locale, prefix: string, opts: { requireName?: boolean } = {}): Parsed<ContactFields> {
  const k = fieldKit(locale, false);
  const schema = z.object({
    name: k.nullableText(a("lfcFieldName", locale), { max: 200, required: opts.requireName }),
    email: k.nullableText(a("contactEmail", locale), { max: 320 }),
    phone: k.nullableText(a("contactPhone", locale), { max: 40 }),
    lineId: k.nullableText(a("contactLine", locale), { max: 100 }),
    preferred: k.enumOf(a("contactPreferred", locale), CASE_PREFERRED_CONTACTS, { required: false }),
    consentContact: k.checkbox(),
  });
  const raw = formDataToObject(formData)[prefix] as object | undefined;
  const parsed = parseForm(schema, raw ?? {});
  if (!parsed.ok) return { ok: false, errors: Object.fromEntries(Object.entries(parsed.errors).map(([key, m]) => [`${prefix}.${key}`, m])) };
  const p = parsed.data;
  const errors: FieldErrors = {};
  if (!p.name && !p.email && !p.phone && !p.lineId) errors[`${prefix}.name`] = a("lfcErrContactAny", locale);
  if (p.email && !EMAIL.test(p.email)) errors[`${prefix}.email`] = a("errEmailFormat", locale);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name: p.name, email: p.email, phone: p.phone, lineId: p.lineId, preferredContact: p.preferred, consentContact: p.consentContact } };
}

export function parseClaim(formData: FormData, locale: Locale): Parsed<{ answer: string; claimant: ContactFields }> {
  const k = fieldKit(locale, false);
  const answer = parseForm(z.object({ answer: k.text(a("lfcFieldClaimAnswer", locale), { required: true, max: ANSWER_MAX }) }), formDataToObject(formData));
  const claimant = parseContactFields(formData, locale, "claimant", { requireName: true });
  const errors: FieldErrors = { ...(answer.ok ? {} : answer.errors), ...(claimant.ok ? {} : claimant.errors) };
  if (!answer.ok || !claimant.ok) return { ok: false, errors };
  return { ok: true, data: { answer: answer.data.answer, claimant: claimant.data } };
}

export function parseRejection(formData: FormData, locale: Locale): Parsed<{ th: string; en: string }> {
  const k = fieldKit(locale, true);
  const parsed = parseForm(z.object({ message: k.bilingual(a("lfcFieldRejectMessage", locale), { required: true, max: 1000 }) }), formDataToObject(formData));
  return parsed.ok ? { ok: true, data: parsed.data.message } : { ok: false, errors: Object.fromEntries(Object.entries(parsed.errors).map(([key, m]) => [key.replace(/^message\./, "message."), m])) };
}

/** Optional collection details for an accepted claim, in Thai, English or both (fields `collection.th` and `collection.en`). */
export function parseCollectionNote(formData: FormData, locale: Locale): Parsed<{ th: string; en: string }> {
  const k = fieldKit(locale, false);
  const parsed = parseForm(z.object({ collection: k.bilingual(a("lfcFieldCollectionNote", locale), { max: 1000 }) }), formDataToObject(formData));
  return parsed.ok ? { ok: true, data: parsed.data.collection } : { ok: false, errors: parsed.errors };
}

export interface HandoverFields {
  collectedByName: string | null;
  idCheckType: (typeof ID_CHECK_TYPES)[number];
  collectedAt: Date;
  deskOrganisationId: number;
  lostCaseId: string | null;
}

export function parseHandover(formData: FormData, locale: Locale, now: Date = new Date()): Parsed<HandoverFields> {
  const k = fieldKit(locale, false);
  const schema = z.object({
    collectedByName: k.nullableText(a("lfcFieldCollector", locale), { max: 200 }),
    idCheckType: k.enumOf(a("lfcFieldIdCheck", locale), ID_CHECK_TYPES),
    collectedAt: k.dateTime(a("lfcFieldCollectedAt", locale), { required: true }),
    deskOrganisationId: k.integer(a("lfcFieldDesk", locale), { min: 1, required: true }),
    lostCaseId: k.reference(a("lfcFieldLostReport", locale)),
  });
  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  if (d.collectedAt && d.collectedAt.getTime() > now.getTime() + 5 * 60_000) return { ok: false, errors: { collectedAt: a("lfcErrCollectedFuture", locale) } };
  return {
    ok: true,
    data: { collectedByName: d.collectedByName, idCheckType: d.idCheckType!, collectedAt: d.collectedAt!, deskOrganisationId: d.deskOrganisationId!, lostCaseId: d.lostCaseId },
  };
}
