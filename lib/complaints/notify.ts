/**
 * Emails around a complaint. Email is never required and never fatal.
 *
 * To the complainant (acknowledged, resolved): decided from what is held
 * WITHOUT decrypting anything: is there an address, did the person agree to be
 * contacted, is email set up. Only when an email will actually go are the
 * contacts decrypted, through `readContacts`, so that read is logged like any
 * other view. An anonymous complaint holds no address, so nothing is sent. The
 * email carries the reference and a pointer to the private link, never the
 * text of the complaint.
 *
 * To staff (escalation): a digest of references to each lead, or for a
 * restricted category to the named staff, because a lead who is not named must
 * not learn that a restricted complaint exists.
 */

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { addNote, listContactSummaries, readContacts, type StaffActor } from "@/lib/cases";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { cases } from "@/lib/db/schema/cases";
import { complaintCategoryAccess } from "@/lib/db/schema/complaints";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { getEmailSender, isEmailConfigured, type EmailSender } from "@/lib/email";
import { complaintAcknowledged, complaintResolved, complaintsEscalated } from "@/lib/email/complaint-templates";

export type ComplainantNotice = "acknowledged" | "resolved";

export type ReminderReason = "no_contact" | "no_consent" | "no_email" | "email_not_configured" | "send_failed";

export type NoticeOutcome = { result: "sent" } | { result: "remind"; reason: ReminderReason };

export type NoticeDecision = { action: "email" } | { action: "remind"; reason: Exclude<ReminderReason, "send_failed"> };

/** Pure: email only if there is an address, consent to be contacted and email is configured. */
export function decideComplainantNotice(input: { hasContact: boolean; hasEmail: boolean; consentContact: boolean; emailConfigured: boolean }): NoticeDecision {
  if (!input.hasContact) return { action: "remind", reason: "no_contact" };
  if (!input.consentContact) return { action: "remind", reason: "no_consent" };
  if (!input.hasEmail) return { action: "remind", reason: "no_email" };
  if (!input.emailConfigured) return { action: "remind", reason: "email_not_configured" };
  return { action: "email" };
}

const NOTE: Record<ComplainantNotice, { sent: string; failed: string }> = {
  acknowledged: { sent: "Emailed the complainant the acknowledgement.", failed: "Could not email the complainant the acknowledgement." },
  resolved: { sent: "Emailed the complainant that there is an outcome.", failed: "Could not email the complainant that there is an outcome." },
};

/** Tells the complainant by email when they agreed to it. Never throws for a delivery problem; the staff member is shown a reminder instead. */
export async function notifyComplainant(
  db: AuditExecutor,
  caseId: string,
  kind: ComplainantNotice,
  actor: StaffActor,
  opts: { sender?: EmailSender; emailConfigured?: boolean; now?: Date; env?: PiiEnv } = {},
): Promise<NoticeOutcome> {
  const summaries = await listContactSummaries(db, caseId, actor);
  const person = summaries.find((c) => c.role === "reporter") ?? summaries[0];
  const decision = decideComplainantNotice({
    hasContact: Boolean(person),
    hasEmail: Boolean(person?.has.email),
    consentContact: Boolean(person?.consentContact),
    emailConfigured: opts.emailConfigured ?? isEmailConfigured(),
  });
  if (decision.action === "remind") return { result: "remind", reason: decision.reason };

  const [row] = await db.select({ reference: cases.reference }).from(cases).where(eq(cases.id, caseId));
  try {
    const contacts = await readContacts(db, caseId, actor, { now: opts.now, env: opts.env });
    const to = contacts.find((c) => c.id === person!.id)?.email;
    if (!to) return { result: "remind", reason: "no_email" };
    const params = { reference: row!.reference };
    await (opts.sender ?? getEmailSender()).send({ to, ...(kind === "acknowledged" ? complaintAcknowledged(params) : complaintResolved(params)) });
    await addNote(db, caseId, NOTE[kind].sent, actor, { now: opts.now });
    return { result: "sent" };
  } catch (error) {
    console.error("[complaints] could not email the complainant", error instanceof Error ? error.name : "error");
    await addNote(db, caseId, NOTE[kind].failed, actor, { now: opts.now }).catch(() => undefined);
    return { result: "remind", reason: "send_failed" };
  }
}

export interface EscalatedItem {
  caseId: string;
  reference: string;
  categoryId: string;
  restricted: boolean;
  reason: "acknowledge" | "resolve";
}

/** Who should hear about an escalation: unit leads for ordinary categories, the named staff for a restricted one. */
export async function escalationRecipients(db: AuditExecutor, items: EscalatedItem[]): Promise<Map<string, EscalatedItem[]>> {
  const byEmail = new Map<string, EscalatedItem[]>();
  const add = (email: string, item: EscalatedItem) => byEmail.set(email, [...(byEmail.get(email) ?? []), item]);

  const open = items.filter((i) => !i.restricted);
  if (open.length > 0) {
    const leads = await db
      .selectDistinct({ email: user.email })
      .from(staffRoles)
      .innerJoin(user, eq(user.id, staffRoles.userId))
      .where(and(eq(staffRoles.role, "unit_lead"), isNull(staffRoles.revokedAt)))
      .orderBy(asc(user.email));
    for (const lead of leads) for (const item of open) add(lead.email, item);
  }
  const restricted = items.filter((i) => i.restricted);
  if (restricted.length > 0) {
    const named = await db
      .select({ email: user.email, categoryId: complaintCategoryAccess.categoryId })
      .from(complaintCategoryAccess)
      .innerJoin(user, eq(user.id, complaintCategoryAccess.userId))
      .where(inArray(complaintCategoryAccess.categoryId, [...new Set(restricted.map((i) => i.categoryId))]));
    for (const person of named) for (const item of restricted.filter((i) => i.categoryId === person.categoryId)) add(person.email, item);
  }
  return byEmail;
}

/** Sends one digest per recipient. Returns how many emails went; a failure to send one is logged and skipped. */
export async function sendEscalationDigests(
  db: AuditExecutor,
  items: EscalatedItem[],
  inboxUrl: string,
  opts: { sender?: EmailSender; emailConfigured?: boolean } = {},
): Promise<number> {
  if (items.length === 0 || !(opts.emailConfigured ?? isEmailConfigured())) return 0;
  const recipients = await escalationRecipients(db, items);
  let sent = 0;
  for (const [email, list] of recipients) {
    try {
      await (opts.sender ?? getEmailSender()).send({ to: email, ...complaintsEscalated({ items: list.map((i) => ({ reference: i.reference, reason: i.reason })), inboxUrl }) });
      sent += 1;
    } catch (error) {
      console.error("[complaints] could not email an escalation digest", error instanceof Error ? error.name : "error");
    }
  }
  return sent;
}
