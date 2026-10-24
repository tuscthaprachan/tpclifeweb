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

import { eq } from "drizzle-orm";
import { addNote } from "@/lib/cases/engine";
import { listContactSummaries, readContacts } from "@/lib/cases/contacts";
import type { StaffActor } from "@/lib/cases/types";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, organisations } from "@/lib/db/schema";
import type { CasePreferredContact } from "@/lib/db/schema/cases";
import { getEmailSender, isEmailConfigured, type EmailSender } from "@/lib/email";
import { lostReportPossibleMatch, lostReportReadyToCollect, lostReportReturned } from "@/lib/email/lost-found-templates";
import type { LocaleString } from "@/lib/i18n/config";

export type NoticeKind = "possible_match" | "ready_to_collect" | "returned";

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
    const message = kind === "possible_match" ? lostReportPossibleMatch(params) : kind === "ready_to_collect" ? lostReportReadyToCollect(params) : lostReportReturned(params);
    await (opts.sender ?? getEmailSender()).send({ to, ...message });
    await addNote(db, lostCaseId, NOTE[kind].sent, actor, { now: opts.now });
    return { result: "sent" };
  } catch (error) {
    console.error("[lost-found] could not email the reporter", error instanceof Error ? error.name : "error");
    await addNote(db, lostCaseId, NOTE[kind].failed, actor, { now: opts.now }).catch(() => undefined);
    return { result: "remind", reason: "send_failed", preferred };
  }
}
