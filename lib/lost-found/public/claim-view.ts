/**
 * What a claimant sees on their tracking page: their own claim and nothing
 * else on the found item's case. The link is issued for one claim
 * (`case_access_tokens.claim_id`), so the page is built from that claim's
 * decision, the item's status, and the public messages staff tagged with the
 * claim id. Other claimants, the item's general timeline and the lost report
 * are never read here.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import { CaseError, type PublicBody } from "@/lib/cases";
import type { AuditExecutor } from "@/lib/db/audit";
import { caseEvents, cases } from "@/lib/db/schema/cases";
import { organisations } from "@/lib/db/schema";
import { lostFoundCaseDetails, lostFoundClaims, lostFoundHandovers } from "@/lib/db/schema/lost-found-staff";
import type { LocaleString } from "@/lib/i18n/config";

export type ClaimStage = "waiting" | "accepted" | "not_accepted" | "returned";

export interface ClaimTrackEntry {
  id: string;
  at: Date;
  title: LocaleString;
  body: PublicBody | null;
}

export interface ClaimTrackView {
  /** The found item's reference, which the claimant used to open the page. */
  reference: string;
  stage: ClaimStage;
  statusLabel: LocaleString;
  submittedAt: Date;
  updatedAt: Date;
  /** Where to collect it, once the claim is accepted. */
  desk: LocaleString | null;
  /** The latest message from staff about collecting it, once the claim is accepted. */
  collectionNote: PublicBody | null;
  timeline: ClaimTrackEntry[];
}

const s = (th: string, en: string): LocaleString => ({ th, en });

export const CLAIM_STAGE_LABEL: Record<ClaimStage, LocaleString> = {
  waiting: s("รอตรวจสอบ", "Waiting to be checked"),
  accepted: s("ยืนยันแล้ว พร้อมให้มารับ", "Accepted, ready to collect"),
  not_accepted: s("ยังยืนยันไม่ได้", "Not accepted"),
  returned: s("คืนให้คุณแล้ว", "Returned to you"),
};

const RECEIVED = s("ได้รับคำขอรับของแล้ว", "Claim received");
const MESSAGE = s("ข้อความจากเจ้าหน้าที่", "Message from staff");

/** The claim view for a link already resolved to `caseId` and `claimId`. Throws `not_found` if the claim is not on that case. */
export async function claimTrackView(db: AuditExecutor, caseId: string, claimId: string): Promise<ClaimTrackView> {
  const [claim] = await db.select().from(lostFoundClaims).where(and(eq(lostFoundClaims.id, claimId), eq(lostFoundClaims.caseId, caseId)));
  if (!claim) throw new CaseError("not_found", "Claim not found.");
  const [item] = await db.select({ reference: cases.reference, status: cases.status }).from(cases).where(eq(cases.id, caseId));
  if (!item) throw new CaseError("not_found", "Case not found.");

  const stage: ClaimStage = claim.decision === "rejected" ? "not_accepted" : claim.decision === "accepted" ? (item.status === "returned" ? "returned" : "accepted") : "waiting";

  const messages = await db
    .select({ id: caseEvents.id, bodyTh: caseEvents.bodyTh, bodyEn: caseEvents.bodyEn, createdAt: caseEvents.createdAt })
    .from(caseEvents)
    .where(and(eq(caseEvents.caseId, caseId), eq(caseEvents.visibility, "public"), eq(caseEvents.type, "public_update"), sql`${caseEvents.metadata} ->> 'claimId' = ${claimId}`))
    .orderBy(asc(caseEvents.createdAt), asc(caseEvents.id));

  const timeline: ClaimTrackEntry[] = [{ id: "received", at: claim.createdAt, title: RECEIVED, body: null }];
  if (claim.decision && claim.decidedAt) timeline.push({ id: "decision", at: claim.decidedAt, title: CLAIM_STAGE_LABEL[claim.decision === "accepted" ? "accepted" : "not_accepted"], body: null });
  if (stage === "returned") {
    const [handover] = await db.select({ collectedAt: lostFoundHandovers.collectedAt }).from(lostFoundHandovers).where(eq(lostFoundHandovers.caseId, caseId));
    if (handover) timeline.push({ id: "returned", at: handover.collectedAt, title: CLAIM_STAGE_LABEL.returned, body: null });
  }
  for (const m of messages) timeline.push({ id: m.id, at: m.createdAt, title: MESSAGE, body: m.bodyTh || m.bodyEn ? { th: m.bodyTh, en: m.bodyEn } : null });
  // Stable, so a decision comes before the message written with it.
  timeline.sort((x, y) => x.at.getTime() - y.at.getTime());

  let desk: LocaleString | null = null;
  if (stage === "accepted") {
    const [held] = await db
      .select({ nameTh: organisations.nameTh, nameEn: organisations.nameEn })
      .from(lostFoundCaseDetails)
      .innerJoin(organisations, eq(organisations.id, lostFoundCaseDetails.storageOrganisationId))
      .where(eq(lostFoundCaseDetails.caseId, caseId));
    if (held) desk = s(`เคาน์เตอร์${held.nameTh}`, `${held.nameEn} desk`);
  }
  const lastMessage = stage === "accepted" ? messages.at(-1) : undefined;

  return {
    reference: item.reference,
    stage,
    statusLabel: CLAIM_STAGE_LABEL[stage],
    submittedAt: claim.createdAt,
    updatedAt: timeline.at(-1)!.at,
    desk,
    collectionNote: lastMessage && (lastMessage.bodyTh || lastMessage.bodyEn) ? { th: lastMessage.bodyTh, en: lastMessage.bodyEn } : null,
    timeline,
  };
}

