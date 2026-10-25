/**
 * Handover: recording that an item was given back.
 *
 * What is kept: who collected it (the name, as an encrypted contact on the
 * case), the TYPE of ID that was checked (student card, national ID and so on)
 * and nothing else about it, when, at which desk (TUSU or TUSC; the form
 * offers the desk that holds the item, else the officer's own) and which
 * officer. There is no field for an ID number, and
 * none is stored anywhere.
 *
 * Recording it moves the found item and the lost report to `returned` through
 * the case engine (which starts the one year personal data clock), marks both
 * public listings `returned` so the public list shows the outcome, and adds an
 * internal note to each. One transaction.
 */

import { and, eq, inArray } from "drizzle-orm";
import { addNote } from "@/lib/cases/engine";
import { insertContact } from "@/lib/cases/contacts";
import { assertStaff, auditContextOf, lockCase } from "@/lib/cases/internal";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import type { PiiEnv } from "@/lib/crypto/pii";
import { recordAudit, type AuditExecutor } from "@/lib/db/audit";
import { cases, organisations } from "@/lib/db/schema";
import { caseContacts } from "@/lib/db/schema/cases";
import { ID_CHECK_TYPES, lostFoundCaseLinks, lostFoundHandovers, type IdCheckType } from "@/lib/db/schema/lost-found-staff";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { advanceTo } from "./common";
import { contentActorOf, expireListing, setListingRegisterStatus } from "./listing";

export interface HandoverInput {
  foundCaseId: string;
  /** The lost report being closed too. Defaults to the confirmed or only linked one. */
  lostCaseId?: string | null;
  /** Needed unless the case already holds a named claimant or owner. */
  collectedByName?: string | null;
  idCheckType: string;
  collectedAt: Date;
  /** The desk handing it over: TUSU or TUSC. Not necessarily the officer's own, because the item may be held at the other desk. */
  deskOrganisationId: number;
}

/** The desk the handover form starts on: where the item is held when that is a desk on offer, else the officer's own. */
export function defaultHandoverDesk(storageOrganisationId: number | null, actingOrganisationId: number, deskIds: readonly number[]): number {
  return storageOrganisationId !== null && deskIds.includes(storageOrganisationId) ? storageOrganisationId : actingOrganisationId;
}

export interface HandoverResult {
  handoverId: string;
  foundCaseId: string;
  lostCaseId: string | null;
}

/** The ID type as staff read it, in their language (the same labels as the handover form). */
export function idCheckLabel(type: IdCheckType, locale: Locale): string {
  return a(`lfcIdCheck_${type}` as AdminKey, locale);
}

export function isIdCheckType(value: string): value is IdCheckType {
  return (ID_CHECK_TYPES as readonly string[]).includes(value);
}

/** Records the handover. Throws `invalid` for a missing collector name, unknown ID type, future time or a desk that is not TUSU or TUSC, and `invalid_transition` if the item cannot be returned from its status. */
export async function recordHandover(db: AuditExecutor, input: HandoverInput, actor: StaffActor, opts: { now?: Date; env?: PiiEnv; staffLocale?: Locale } = {}): Promise<HandoverResult> {
  const now = opts.now ?? new Date();
  if (!isIdCheckType(input.idCheckType)) throw new CaseError("invalid", "Choose which ID was checked.");
  if (!(input.collectedAt.getTime() <= now.getTime() + 5 * 60_000)) throw new CaseError("invalid", "The collection time cannot be in the future.");

  const th = opts.staffLocale === "th";
  const idLabel = idCheckLabel(input.idCheckType, opts.staffLocale ?? "en");

  const result = await db.transaction(async (tx) => {
    const found = await lockCase(tx, input.foundCaseId);
    assertStaff(actor, found.service);
    if (found.service !== "lost_found" || found.kind !== "found") throw new CaseError("invalid", "A handover is recorded on a found item.");
    if (found.piiDeletedAt) throw new CaseError("pii_deleted", "Personal data for this case has been deleted.");
    const [desk] = await tx.select({ slug: organisations.slug }).from(organisations).where(eq(organisations.id, input.deskOrganisationId));
    if (desk?.slug !== "tusu" && desk?.slug !== "tusc") throw new CaseError("invalid", "Choose the TUSU or TUSC desk that handed the item over.");
    const [already] = await tx.select({ id: lostFoundHandovers.id }).from(lostFoundHandovers).where(eq(lostFoundHandovers.caseId, found.id));
    if (already) throw new CaseError("stale", "A handover has already been recorded.");

    // Who collected it: the named person if given, else a contact the case already holds.
    const held = await tx
      .select({ id: caseContacts.id, role: caseContacts.role, nameEnc: caseContacts.nameEnc })
      .from(caseContacts)
      .where(and(eq(caseContacts.caseId, found.id), inArray(caseContacts.role, ["claimant", "owner"])));
    const named = held.find((c) => c.nameEnc);
    let collectedBy: string | null = null;
    const name = input.collectedByName?.trim();
    if (name) collectedBy = await insertContact(tx, found.id, { role: "owner", name }, actor, now, opts.env);
    else if (named) collectedBy = named.id;
    else throw new CaseError("invalid", "Enter the name of the person collecting.");

    // The lost report that goes with it.
    let lostCaseId = input.lostCaseId ?? null;
    if (!lostCaseId) {
      const links = await tx
        .select()
        .from(lostFoundCaseLinks)
        .where(and(eq(lostFoundCaseLinks.foundCaseId, found.id), inArray(lostFoundCaseLinks.status, ["confirmed", "possible"])));
      lostCaseId = (links.find((l) => l.status === "confirmed") ?? (links.length === 1 ? links[0] : undefined))?.lostCaseId ?? null;
    } else {
      const [lost] = await tx.select({ kind: cases.kind }).from(cases).where(eq(cases.id, lostCaseId));
      if (lost?.kind !== "lost") throw new CaseError("invalid", "That is not a lost report.");
    }

    const [created] = await tx
      .insert(lostFoundHandovers)
      .values({
        caseId: found.id,
        lostCaseId,
        collectedByContactId: collectedBy,
        idCheckType: input.idCheckType,
        collectedAt: input.collectedAt,
        deskOrganisationId: input.deskOrganisationId,
        officerUserId: actor.userId,
        createdAt: now,
      })
      .returning({ id: lostFoundHandovers.id });

    await advanceTo(tx, found.id, "returned", actor, { now });
    // A report that was withdrawn or closed as not found is left as it is; only the found item is returned.
    const [lostRow] = lostCaseId ? await tx.select({ status: cases.status }).from(cases).where(eq(cases.id, lostCaseId)) : [];
    if (lostCaseId && lostRow && !["withdrawn", "closed_unfound"].includes(lostRow.status)) {
      await advanceTo(tx, lostCaseId, "returned", actor, { now });
      await tx
        .update(lostFoundCaseLinks)
        .set({ status: "confirmed", updatedAt: now })
        .where(and(eq(lostFoundCaseLinks.foundCaseId, found.id), eq(lostFoundCaseLinks.lostCaseId, lostCaseId)));
      await addNote(tx, lostCaseId, th ? `คืนให้เจ้าของแล้ว (ของที่พบ ${found.reference}) บัตรที่ตรวจ: ${idLabel}` : `Returned to the owner (found item ${found.reference}). ID checked: ${idLabel}.`, actor, { now });
    }
    await addNote(tx, found.id, th ? `ส่งมอบของแล้ว บัตรที่ตรวจ: ${idLabel}` : `Handed over. ID checked: ${idLabel}.`, actor, { now });
    const content = contentActorOf(actor);
    await setListingRegisterStatus(tx, found.id, "returned", content, now);
    if (lostCaseId && lostRow && !["withdrawn", "closed_unfound"].includes(lostRow.status)) await setListingRegisterStatus(tx, lostCaseId, "returned", content, now);
    // The audit entry names no person and holds no ID detail.
    await recordAudit(tx, {
      ...auditContextOf(actor),
      action: "lost_found.handover",
      entityType: "case",
      entityId: found.id,
      after: { handoverId: created!.id, idCheckType: input.idCheckType, deskOrganisationId: input.deskOrganisationId, lostCaseId },
    });
    return { handoverId: created!.id, foundCaseId: found.id, lostCaseId };
  });
  await expireListing(db, result.foundCaseId);
  if (result.lostCaseId) await expireListing(db, result.lostCaseId);
  return result;
}

/** The recorded handover for a found item, if any. No personal data. */
export async function getHandover(db: AuditExecutor, foundCaseId: string) {
  const [row] = await db.select().from(lostFoundHandovers).where(eq(lostFoundHandovers.caseId, foundCaseId));
  return row ?? null;
}
