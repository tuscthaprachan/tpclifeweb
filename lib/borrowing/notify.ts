/**
 * Emails to the borrower: the decision, the reminder the working day before a
 * return, and one overdue notice. Email is never required and never fatal.
 *
 * Whether an email will go is decided from what is held WITHOUT decrypting
 * anything: is there a borrower contact with an address, is email set up. Only
 * then is the address decrypted, in a transaction that logs the view (a
 * `contact_viewed` event and an audit entry), whether staff asked for it or the
 * daily job (`system`). Giving an address on the request is the consent: the
 * form says it is for the decision and the return reminder. A failure to send
 * is logged and returned as a reminder for staff to tell the person by hand;
 * it never blocks the step that was just committed.
 */

import { and, eq } from "drizzle-orm";
import type { CaseActor, PublicUpdateText } from "@/lib/cases";
import { appendEvent, auditContextOf, lockCase, type NewEvent } from "@/lib/cases/internal";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import { contactAad } from "@/lib/cases/contacts";
import { decryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, equipmentCategories, equipmentItems } from "@/lib/db/schema/borrowing";
import { caseContacts, cases } from "@/lib/db/schema/cases";
import { getEmailSender, isEmailConfigured, type EmailSender } from "@/lib/email";
import { loanApproved, loanDeclined, loanOverdue, loanReminder } from "@/lib/email/borrowing-status-templates";
import type { RenderedEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";

export type BorrowerNotice = "approved" | "declined" | "reminder" | "overdue";

export type ReminderReason = "no_contact" | "no_email" | "email_not_configured" | "send_failed";

export type NoticeOutcome = { result: "sent" } | { result: "remind"; reason: ReminderReason };

export type NoticeDecision = { action: "email" } | { action: "remind"; reason: Exclude<ReminderReason, "send_failed"> };

/** Pure: email only if there is a borrower, an address and email is set up. */
export function decideBorrowerNotice(input: { hasContact: boolean; hasEmail: boolean; emailConfigured: boolean }): NoticeDecision {
  if (!input.hasContact) return { action: "remind", reason: "no_contact" };
  if (!input.hasEmail) return { action: "remind", reason: "no_email" };
  if (!input.emailConfigured) return { action: "remind", reason: "email_not_configured" };
  return { action: "email" };
}

const NOTE: Record<BorrowerNotice, { sent: string; failed: string }> = {
  approved: { sent: "Emailed the borrower that the request is approved.", failed: "Could not email the borrower that the request is approved." },
  declined: { sent: "Emailed the borrower that the request was not approved.", failed: "Could not email the borrower that the request was not approved." },
  reminder: { sent: "Emailed the borrower a reminder to return the equipment.", failed: "Could not email the borrower a reminder to return the equipment." },
  overdue: { sent: "Emailed the borrower that the equipment is overdue.", failed: "Could not email the borrower that the equipment is overdue." },
};

export interface NotifyOpts {
  sender?: EmailSender;
  emailConfigured?: boolean;
  now?: Date;
  env?: PiiEnv;
  /** For `declined`: the reason staff gave, as the borrower reads it. */
  reason?: PublicUpdateText;
}

/** What the email needs that holds no personal data. */
async function loadMailFacts(db: AuditExecutor, caseId: string) {
  const [row] = await db
    .select({ reference: cases.reference, locale: cases.locale, collectAt: borrowingRequests.collectAt, returnDueAt: borrowingRequests.returnDueAt })
    .from(cases)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
    .where(eq(cases.id, caseId));
  if (!row) return null;
  const cats = await db
    .select({ cards: equipmentCategories.depositCards })
    .from(borrowingLines)
    .innerJoin(equipmentItems, eq(equipmentItems.id, borrowingLines.itemId))
    .innerJoin(equipmentCategories, eq(equipmentCategories.id, equipmentItems.categoryId))
    .where(eq(borrowingLines.caseId, caseId));
  return { ...row, cards: cats.reduce((max, c) => Math.max(max, c.cards), 0) };
}

/** Decrypts the borrower's address, logging the view like every other read of a contact. */
async function readBorrowerEmail(db: AuditExecutor, caseId: string, contactId: string, actor: CaseActor, now: Date, env?: PiiEnv): Promise<string | null> {
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (actor.kind === "staff") await assertCaseAccess(tx, row, actor);
    const [contact] = await tx.select().from(caseContacts).where(and(eq(caseContacts.id, contactId), eq(caseContacts.caseId, caseId)));
    if (!contact?.emailEnc) return null;
    const email = decryptOptionalPii(contact.emailEnc, contactAad(contact.id, "email"), env);
    await appendEvent(tx, caseId, actor, now, { type: "contact_viewed", metadata: { contactIds: [contact.id], purpose: "email" } });
    await audit({ action: "case_contact.view", entityType: "case", entityId: caseId, after: { contactIds: [contact.id], reference: row.reference, purpose: "email" } });
    return email;
  });
}

async function record(db: AuditExecutor, caseId: string, actor: CaseActor, now: Date, event: NewEvent): Promise<void> {
  await db.transaction((tx) => appendEvent(tx, caseId, actor, now, event));
}

/**
 * Tells the borrower by email when they gave an address. For staff steps call
 * it after the step has committed; for the daily job pass `{ kind: "system" }`.
 * Never throws for a delivery problem.
 */
export async function notifyBorrower(db: AuditExecutor, caseId: string, kind: BorrowerNotice, actor: CaseActor, opts: NotifyOpts = {}): Promise<NoticeOutcome> {
  const now = opts.now ?? new Date();
  const [contact] = await db
    .select({ id: caseContacts.id, hasEmail: caseContacts.emailEnc })
    .from(caseContacts)
    .where(and(eq(caseContacts.caseId, caseId), eq(caseContacts.role, "borrower")));
  const decision = decideBorrowerNotice({ hasContact: Boolean(contact), hasEmail: Boolean(contact?.hasEmail), emailConfigured: opts.emailConfigured ?? isEmailConfigured() });
  if (decision.action === "remind") return { result: "remind", reason: decision.reason };

  const event = (note: string): NewEvent => (kind === "reminder" || kind === "overdue" ? { type: "reminder_sent", body: note, metadata: { kind } } : { type: "internal_note", body: note });
  try {
    const facts = await loadMailFacts(db, caseId);
    if (!facts) return { result: "remind", reason: "no_contact" };
    const to = await readBorrowerEmail(db, caseId, contact!.id, actor, now, opts.env);
    if (!to) return { result: "remind", reason: "no_email" };
    const locale = (facts.locale as Locale | null) ?? null;
    const base = { reference: facts.reference, locale };
    const mail: RenderedEmail =
      kind === "approved"
        ? loanApproved({ ...base, collectAt: facts.collectAt, returnDueAt: facts.returnDueAt, cards: facts.cards })
        : kind === "declined"
          ? loanDeclined({ ...base, reason: opts.reason ?? {} })
          : kind === "reminder"
            ? loanReminder({ ...base, returnDueAt: facts.returnDueAt })
            : loanOverdue({ ...base, returnDueAt: facts.returnDueAt });
    await (opts.sender ?? getEmailSender()).send({ to, ...mail });
    await record(db, caseId, actor, now, event(NOTE[kind].sent));
    return { result: "sent" };
  } catch (error) {
    console.error("[borrowing] could not email the borrower", error instanceof Error ? error.name : "error");
    await record(db, caseId, actor, now, event(NOTE[kind].failed)).catch(() => undefined);
    return { result: "remind", reason: "send_failed" };
  }
}
