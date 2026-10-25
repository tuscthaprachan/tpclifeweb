/**
 * People in a case. Every personal field is encrypted (lib/crypto/pii.ts) and
 * bound to its row and column. Reading them for display goes through
 * `readContacts`, which records a `contact_viewed` event and an audit entry in
 * the same transaction, so no view goes unlogged. Nothing here ever writes
 * plaintext: without a key `PiiUnavailableError` is thrown and the
 * transaction rolls back.
 */

import { asc, eq } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseContacts, type CaseContactRole, type CaseContactRow, type CasePreferredContact, CASE_CONTACT_ROLES, CASE_PREFERRED_CONTACTS } from "@/lib/db/schema/cases";
import { decryptOptionalPii, encryptOptionalPii, needsReencryption, reencryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { appendEvent, auditContextOf, cleanText, lockCase } from "./internal";
import { assertCaseAccess } from "./restrictions";
import { CaseError, type CaseActor } from "./types";

export interface ContactInput {
  role: CaseContactRole;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  lineId?: string | null;
  preferredContact?: CasePreferredContact | null;
  /** Agreed to be contacted about this case. */
  consentContact?: boolean;
  /** Agreed that details may be shared with the other party. */
  consentShare?: boolean;
}

/** A contact with its personal fields decrypted. Only `readContacts` returns this. */
export interface Contact {
  id: string;
  role: CaseContactRole;
  name: string | null;
  email: string | null;
  phone: string | null;
  lineId: string | null;
  preferredContact: CasePreferredContact | null;
  consentContact: boolean;
  consentShare: boolean;
  createdAt: Date;
}

/** What is held, without any personal data. Safe to show without logging a view. */
export interface ContactSummary {
  id: string;
  role: CaseContactRole;
  has: { name: boolean; email: boolean; phone: boolean; lineId: boolean };
  preferredContact: CasePreferredContact | null;
  consentContact: boolean;
  consentShare: boolean;
}

const FIELD_MAX = 320;
const COLUMNS = { name: "name", email: "email", phone: "phone", lineId: "line_id" } as const;

/** The AAD that binds a value to its row and column. */
export function contactAad(rowId: string, column: keyof typeof COLUMNS): string {
  return `case_contacts:${COLUMNS[column]}:${rowId}`;
}

function field(value: string | null | undefined, what: string): string | null {
  const text = value?.trim();
  if (!text) return null;
  return cleanText(text, FIELD_MAX, what);
}

/** Inserts a contact inside a transaction the caller owns. Used by `createCase`. */
export async function insertContact(tx: AuditExecutor, caseId: string, input: ContactInput, actor: CaseActor, now: Date, env?: PiiEnv): Promise<string> {
  if (!CASE_CONTACT_ROLES.includes(input.role)) throw new CaseError("invalid", "Unknown contact role.");
  if (input.preferredContact != null && !CASE_PREFERRED_CONTACTS.includes(input.preferredContact)) throw new CaseError("invalid", "Unknown preferred contact method.");
  const name = field(input.name, "Name");
  const email = field(input.email, "Email address");
  const phone = field(input.phone, "Phone number");
  const lineId = field(input.lineId, "LINE ID");
  if (!name && !email && !phone && !lineId) throw new CaseError("invalid", "A contact needs at least one detail.");

  const id = crypto.randomUUID();
  await tx.insert(caseContacts).values({
    id,
    caseId,
    role: input.role,
    nameEnc: encryptOptionalPii(name, contactAad(id, "name"), env),
    emailEnc: encryptOptionalPii(email, contactAad(id, "email"), env),
    phoneEnc: encryptOptionalPii(phone, contactAad(id, "phone"), env),
    lineIdEnc: encryptOptionalPii(lineId, contactAad(id, "lineId"), env),
    preferredContact: input.preferredContact ?? null,
    consentContact: input.consentContact ?? false,
    consentShare: input.consentShare ?? false,
    consentRecordedAt: now,
    createdAt: now,
  });
  await appendEvent(tx, caseId, actor, now, { type: "contact_added", metadata: { contactId: id, role: input.role } });
  return id;
}

/**
 * Adds a person to a case. A `public` actor may add one (a reporter on their
 * own report, after the caller resolved their tracking link); staff and
 * `system` may too. Returns the contact id.
 */
export async function addContact(db: AuditExecutor, caseId: string, input: ContactInput, actor: CaseActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<string> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (actor.kind === "staff") await assertCaseAccess(tx, row, actor);
    if (row.piiDeletedAt) throw new CaseError("pii_deleted", "Personal data for this case has been deleted.");
    const id = await insertContact(tx, caseId, input, actor, now, opts.env);
    await audit({ action: "case_contact.add", entityType: "case", entityId: caseId, after: { contactId: id, role: input.role } });
    return id;
  });
}

function toSummary(r: CaseContactRow): ContactSummary {
  return {
    id: r.id,
    role: r.role as CaseContactRole,
    has: { name: Boolean(r.nameEnc), email: Boolean(r.emailEnc), phone: Boolean(r.phoneEnc), lineId: Boolean(r.lineIdEnc) },
    preferredContact: r.preferredContact as CasePreferredContact | null,
    consentContact: r.consentContact,
    consentShare: r.consentShare,
  };
}

/** Which contacts exist and what they hold, with no personal data and no view logged. Staff only. */
export async function listContactSummaries(db: AuditExecutor, caseId: string, actor: CaseActor): Promise<ContactSummary[]> {
  return db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const rows = await tx.select().from(caseContacts).where(eq(caseContacts.caseId, caseId)).orderBy(asc(caseContacts.createdAt));
    return rows.map(toSummary);
  });
}

/**
 * Decrypts a case's contacts for a member of staff to read. This is the only
 * way to read personal data for display, and it records a `contact_viewed`
 * event (internal) and a `case_contact.view` audit entry in the same
 * transaction. Returns an empty list, logging nothing, when there is nothing
 * to show (none held, or deleted by retention).
 */
export async function readContacts(db: AuditExecutor, caseId: string, actor: CaseActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<Contact[]> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const rows = await tx.select().from(caseContacts).where(eq(caseContacts.caseId, caseId)).orderBy(asc(caseContacts.createdAt));
    if (rows.length === 0) return [];
    const contacts = rows.map(
      (r): Contact => ({
        id: r.id,
        role: r.role as CaseContactRole,
        name: decryptOptionalPii(r.nameEnc, contactAad(r.id, "name"), opts.env),
        email: decryptOptionalPii(r.emailEnc, contactAad(r.id, "email"), opts.env),
        phone: decryptOptionalPii(r.phoneEnc, contactAad(r.id, "phone"), opts.env),
        lineId: decryptOptionalPii(r.lineIdEnc, contactAad(r.id, "lineId"), opts.env),
        preferredContact: r.preferredContact as CasePreferredContact | null,
        consentContact: r.consentContact,
        consentShare: r.consentShare,
        createdAt: r.createdAt,
      }),
    );
    const contactIds = contacts.map((c) => c.id);
    await appendEvent(tx, caseId, actor, now, { type: "contact_viewed", metadata: { contactIds } });
    await audit({ action: "case_contact.view", entityType: "case", entityId: caseId, after: { contactIds, reference: row.reference } });
    return contacts;
  });
}

/**
 * Key rotation: re-encrypts up to `limit` contacts that were made with an
 * older key (optionally one case's). Run it repeatedly until it returns 0,
 * then drop the old key. Throws if a value matches no configured key.
 */
export async function reencryptContacts(db: AuditExecutor, opts: { limit?: number; caseId?: string; env?: PiiEnv } = {}): Promise<number> {
  const rows = await db.select().from(caseContacts).where(opts.caseId ? eq(caseContacts.caseId, opts.caseId) : undefined);
  let changed = 0;
  for (const r of rows) {
    if (changed >= (opts.limit ?? 100)) break;
    const next: Partial<typeof caseContacts.$inferInsert> = {};
    const spec = [
      ["nameEnc", "name"],
      ["emailEnc", "email"],
      ["phoneEnc", "phone"],
      ["lineIdEnc", "lineId"],
    ] as const;
    for (const [prop, column] of spec) {
      const value = r[prop];
      if (value && needsReencryption(value, opts.env)) next[prop] = reencryptPii(value, contactAad(r.id, column), opts.env);
    }
    if (Object.keys(next).length > 0) {
      await db.update(caseContacts).set(next).where(eq(caseContacts.id, r.id));
      changed += 1;
    }
  }
  return changed;
}
