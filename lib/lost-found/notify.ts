/**
 * Telling the person who reported something lost that it has moved on: a
 * possible match, ready to collect, returned.
 *
 * The decision is made from what is held WITHOUT decrypting anything: is there
 * an email address, did the person agree to be contacted, is email set up. Only
 * when an email will actually be sent are the contacts decrypted, through
 * `readContacts`, so that read is logged like any other view. Otherwise the
 * officer is shown a "Contact the person" reminder with the person's preferred
 * method (the details themselves are behind the usual logged Show).
 *
 * A failed send never fails the officer's action: it comes back as a reminder.
 */

import { ensureSiteText } from "@/lib/content/site-text";
import { and, eq } from "drizzle-orm";
import { addNote } from "@/lib/cases/engine";
import { contactAad, listContactSummaries, readContacts } from "@/lib/cases/contacts";
import { appendEvent, auditContextOf, lockCase } from "@/lib/cases/internal";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import type { StaffActor } from "@/lib/cases/types";
import { decryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseContacts, cases, organisations } from "@/lib/db/schema";
import { lostFoundClaims } from "@/lib/db/schema/lost-found-staff";
import type { CasePreferredContact } from "@/lib/db/schema/cases";
import { getEmailSender, isEmailConfigured, type EmailSender } from "@/lib/email";
import { claimAccepted, claimDeclined, lostReportClaimDeclined, lostReportPossibleMatch, lostReportReadyToCollect, lostReportReturned } from "@/lib/email/lost-found-templates";
import type { LocaleString } from "@/lib/i18n/config";

export type NoticeKind = "possible_match" | "ready_to_collect" | "returned" | "claim_declined";

export type ReminderReason = "no_contact" | "no_consent" | "no_email" | "email_not_configured" | "send_failed";

export type NoticeDecision = { action: "email" } | { action: "remind"; reason: Exclude<ReminderReason, "send_failed"> };

/** Pure: email only if there is an address, consent to be contacted and email is configured. */
export function decideReporterNotice(input: { hasContact: boolean; hasEmail: boolean; consentContact: boolean; emailConfigured: boolean }): NoticeDecision {
  if (!input.hasContact) return { action: "remind", reason: "no_contact" };
  if (!input.consentContact) return { action: "remind", reason: "no_consent" };
  if (!input.hasEmail) return { action: "remind", reason: "no_email" };
  if (!input.emailConfigured) return { action: "remind", reason: "email_not_configured" };
  return { action: "email" };
}

export type NoticeOutcome =
  | { result: "sent" }
  | { result: "remind"; reason: ReminderReason; preferred: CasePreferredContact | null };

const NOTE: Record<NoticeKind, { sent: string; failed: string }> = {
  possible_match: { sent: "Emailed the reporter about the possible match.", failed: "Could not email the reporter about the possible match." },
  ready_to_collect: { sent: "Emailed the reporter that the item is ready to collect.", failed: "Could not email the reporter that the item is ready to collect." },
  returned: { sent: "Emailed the reporter that the item was returned.", failed: "Could not email the reporter that the item was returned." },
  claim_declined: { sent: "Emailed the reporter that the claim was not accepted.", failed: "Could not email the reporter that the claim was not accepted." },
};

/**
 * Notifies the reporter of a lost report. `deskOrganisationId` names the desk
 * holding the item, for the email. Never throws for a delivery problem.
 */
export async function notifyLostReporter(
  db: AuditExecutor,
  lostCaseId: string,
  kind: NoticeKind,
  actor: StaffActor,
  opts: { deskOrganisationId?: number | null; sender?: EmailSender; emailConfigured?: boolean; now?: Date; env?: PiiEnv } = {},
): Promise<NoticeOutcome> {
  await ensureSiteText();
  const summaries = await listContactSummaries(db, lostCaseId, actor);
  const reporter = summaries.find((c) => c.role === "reporter") ?? summaries[0];
  const decision = decideReporterNotice({
    hasContact: Boolean(reporter),
    hasEmail: Boolean(reporter?.has.email),
    consentContact: Boolean(reporter?.consentContact),
    emailConfigured: opts.emailConfigured ?? isEmailConfigured(),
  });
  const preferred = reporter?.preferredContact ?? null;
  if (decision.action === "remind") return { result: "remind", reason: decision.reason, preferred };

  const [row] = await db.select({ reference: cases.reference }).from(cases).where(eq(cases.id, lostCaseId));
  let desk: LocaleString | null = null;
  if (opts.deskOrganisationId) {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, opts.deskOrganisationId));
    if (org) desk = { th: org.nameTh, en: org.nameEn };
  }
  try {
    const contacts = await readContacts(db, lostCaseId, actor, { now: opts.now, env: opts.env });
    const to = contacts.find((c) => c.id === reporter!.id)?.email;
    if (!to) return { result: "remind", reason: "no_email", preferred };
    const params = { reference: row!.reference, desk };
    const message = {
      possible_match: lostReportPossibleMatch,
      ready_to_collect: lostReportReadyToCollect,
      returned: lostReportReturned,
      claim_declined: lostReportClaimDeclined,
    }[kind](params);
    await (opts.sender ?? getEmailSender()).send({ to, ...message });
    await addNote(db, lostCaseId, NOTE[kind].sent, actor, { now: opts.now });
    return { result: "sent" };
  } catch (error) {
    console.error("[lost-found] could not email the reporter", error instanceof Error ? `${error.name}: ${error.message}` : "error");
    await addNote(db, lostCaseId, NOTE[kind].failed, actor, { now: opts.now }).catch(() => undefined);
    return { result: "remind", reason: "send_failed", preferred };
  }
}

export type ClaimDecision = "accepted" | "rejected";

const CLAIM_NOTE: Record<ClaimDecision, { sent: string; failed: string }> = {
  accepted: { sent: "Emailed the claimant that the claim was accepted.", failed: "Could not email the claimant that the claim was accepted." },
  rejected: { sent: "Emailed the claimant that the claim was not accepted.", failed: "Could not email the claimant that the claim was not accepted." },
};

/**
 * Tells the person who made a claim on a found item how it was decided, when
 * they gave an address and agreed to be contacted. Same rules as the reporter:
 * nothing is decrypted unless an email will go, and the read is logged.
 */
export async function notifyClaimant(
  db: AuditExecutor,
  claimId: string,
  decision: ClaimDecision,
  actor: StaffActor,
  opts: { deskOrganisationId?: number | null; sender?: EmailSender; emailConfigured?: boolean; now?: Date; env?: PiiEnv } = {},
): Promise<NoticeOutcome> {
  await ensureSiteText();
  const now = opts.now ?? new Date();
  const [claim] = await db.select({ caseId: lostFoundClaims.caseId, contactId: lostFoundClaims.claimantContactId }).from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
  if (!claim) return { result: "remind", reason: "no_contact", preferred: null };
  const [contact] = claim.contactId
    ? await db
        .select({ id: caseContacts.id, hasEmail: caseContacts.emailEnc, consentContact: caseContacts.consentContact, preferred: caseContacts.preferredContact })
        .from(caseContacts)
        .where(and(eq(caseContacts.id, claim.contactId), eq(caseContacts.caseId, claim.caseId)))
    : [];
  const preferred = (contact?.preferred as CasePreferredContact | null | undefined) ?? null;
  const decided = decideReporterNotice({
    hasContact: Boolean(contact),
    hasEmail: Boolean(contact?.hasEmail),
    consentContact: Boolean(contact?.consentContact),
    emailConfigured: opts.emailConfigured ?? isEmailConfigured(),
  });
  if (decided.action === "remind") return { result: "remind", reason: decided.reason, preferred };

  const [row] = await db.select({ reference: cases.reference }).from(cases).where(eq(cases.id, claim.caseId));
  let desk: LocaleString | null = null;
  if (opts.deskOrganisationId) {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, opts.deskOrganisationId));
    if (org) desk = { th: org.nameTh, en: org.nameEn };
  }
  try {
    const to = await withAudit(db, auditContextOf(actor), async (tx, audit) => {
      const found = await lockCase(tx, claim.caseId);
      await assertCaseAccess(tx, found, actor);
      const [held] = await tx.select().from(caseContacts).where(and(eq(caseContacts.id, contact!.id), eq(caseContacts.caseId, claim.caseId)));
      if (!held?.emailEnc) return null;
      const address = decryptOptionalPii(held.emailEnc, contactAad(held.id, "email"), opts.env);
      await appendEvent(tx, claim.caseId, actor, now, { type: "contact_viewed", metadata: { contactIds: [held.id], purpose: "email" } });
      await audit({ action: "case_contact.view", entityType: "case", entityId: claim.caseId, after: { contactIds: [held.id], reference: found.reference, purpose: "email" } });
      return address;
    });
    if (!to) return { result: "remind", reason: "no_email", preferred };
    const params = { reference: row!.reference, desk };
    await (opts.sender ?? getEmailSender()).send({ to, ...(decision === "accepted" ? claimAccepted(params) : claimDeclined(params)) });
    await addNote(db, claim.caseId, CLAIM_NOTE[decision].sent, actor, { now: opts.now });
    return { result: "sent" };
  } catch (error) {
    console.error("[lost-found] could not email the claimant", error instanceof Error ? `${error.name}: ${error.message}` : "error");
    await addNote(db, claim.caseId, CLAIM_NOTE[decision].failed, actor, { now: opts.now }).catch(() => undefined);
    return { result: "remind", reason: "send_failed", preferred };
  }
}
