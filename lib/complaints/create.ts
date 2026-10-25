/**
 * Opening a complaint. ONE transaction, so either everything below exists or
 * nothing does (and the reference number is given back):
 *
 *   the case (service complaint) with the person's contact, encrypted, if they gave one
 *   the complaint row: category, identity, the text they wrote (encrypted) and the due dates
 *   the evidence files they attached, moved from their journey
 *   a private tracking link
 *
 * An anonymous complaint has no contact at all: the tracking link, shown once,
 * is the only way back to it.
 */

import { eq } from "drizzle-orm";
import { createCase, issueTrackingLink, type CaseActor, type ContactInput } from "@/lib/cases";
import { decryptPii, encryptOptionalPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { recordAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseAttachments, caseContacts } from "@/lib/db/schema/cases";
import { complaintCases, complaintEvidence, complaintJourneyFiles, type ComplaintIdentity } from "@/lib/db/schema/complaints";
import type { Locale } from "@/lib/i18n/config";
import { complaintTextAad, evidenceNameAad, journeyFileNameAad } from "./aad";
import { getCategory } from "./categories";
import { ComplaintError } from "./errors";
import { addWorkingDays } from "./working-days";

export interface NewComplaint {
  categoryId: string;
  identity: ComplaintIdentity;
  description: string;
  when?: string | null;
  where?: string | null;
  remedy?: string | null;
  /** Null for an anonymous complaint. */
  contact: ContactInput | null;
  locale: Locale;
  /** The journey whose uploaded files become this complaint's evidence. */
  journeyId?: string | null;
}

export interface CreatedComplaint {
  caseId: string;
  reference: string;
  /** The private tracking token, to be shown once. */
  token: string;
}

/** Opens a complaint. Throws `ComplaintError("invalid")` for an unknown or inactive category, or `PiiUnavailableError`. */
export async function createComplaint(
  db: AuditExecutor,
  input: NewComplaint,
  actor: CaseActor,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<CreatedComplaint> {
  const now = opts.now ?? new Date();
  if (input.identity === "anonymous" && input.contact) throw new ComplaintError("invalid", "An anonymous complaint holds no contact details.");
  if (input.identity !== "anonymous" && !input.contact) throw new ComplaintError("invalid", "A named or pseudonymous complaint needs a way to reach the person.");

  return db.transaction(async (tx) => {
    const category = await getCategory(tx, input.categoryId);
    if (!category || !category.active) throw new ComplaintError("invalid", "Unknown complaint category.");

    const created = await createCase(
      tx,
      {
        service: "complaint",
        kind: "complaint",
        subtype: category.key,
        summary: `Complaint: ${category.nameEn}`,
        locale: input.locale,
        contacts: input.contact ? [input.contact] : [],
      },
      actor,
      { now, env: opts.env },
    );

    const enc = (value: string | null | undefined, column: Parameters<typeof complaintTextAad>[1]) =>
      encryptOptionalPii(value, complaintTextAad(created.id, column), opts.env);
    await tx.insert(complaintCases).values({
      caseId: created.id,
      categoryId: category.id,
      identity: input.identity,
      descriptionEnc: enc(input.description, "description"),
      whenEnc: enc(input.when, "when"),
      whereEnc: enc(input.where, "where"),
      remedyEnc: enc(input.remedy, "remedy"),
      acknowledgeDueAt: addWorkingDays(now, category.acknowledgeDays),
      resolveDueAt: addWorkingDays(now, category.resolveDays),
      createdAt: now,
    });

    let evidence = 0;
    if (input.journeyId) {
      const files = await tx.select().from(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, input.journeyId));
      for (const file of files) {
        const [attachment] = await tx
          .insert(caseAttachments)
          .values({ caseId: created.id, storageKey: file.storageKey, contentType: file.contentType, size: file.size, uploadedBy: null, createdAt: now })
          .returning({ id: caseAttachments.id });
        const id = crypto.randomUUID();
        const name = file.nameEnc ? decryptPii(file.nameEnc, journeyFileNameAad(file.id), opts.env) : null;
        await tx.insert(complaintEvidence).values({
          id,
          caseId: created.id,
          attachmentId: attachment!.id,
          nameEnc: name ? encryptPii(name, evidenceNameAad(id), opts.env) : null,
          createdAt: now,
        });
        evidence += 1;
      }
      // The files now belong to the complaint; the journey's rows go without deleting the objects.
      await tx.delete(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, input.journeyId));
    }

    await recordAudit(tx, {
      actorUserId: null,
      ip: actor.context?.ip ?? null,
      userAgent: actor.context?.userAgent ?? null,
      requestId: actor.context?.requestId ?? null,
      action: "complaint.create",
      entityType: "case",
      entityId: created.id,
      after: { reference: created.reference, category: category.key, identity: input.identity, evidence, contact: Boolean(input.contact) },
    });
    const link = await issueTrackingLink(tx, created.id, actor, { now });
    return { caseId: created.id, reference: created.reference, token: link.token };
  });
}

/** True when a contact row exists for the case (kept out of `createComplaint` so tests can check anonymity directly). */
export async function hasContacts(db: AuditExecutor, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: caseContacts.id }).from(caseContacts).where(eq(caseContacts.caseId, caseId)).limit(1);
  return rows.length > 0;
}
