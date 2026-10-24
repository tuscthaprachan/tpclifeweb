/**
 * Linking a lost report to a found item as a possible match. An officer makes
 * the link; the system only suggests (lib/lost-found/matching.ts). Linking
 * moves the lost report to `match_found` and the found item to `claim_pending`
 * through the case engine (so each state machine is respected and each move
 * is audited), adds an internal note to both, and marks both public listings
 * `matched`. It all happens in one transaction.
 */

import { and, eq } from "drizzle-orm";
import { addNote, getCase } from "@/lib/cases/engine";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { lostFoundCaseLinks } from "@/lib/db/schema/lost-found-staff";
import { advanceTo } from "./common";
import { MATCHABLE_FOUND_STATUSES, MATCHABLE_LOST_STATUSES } from "./matching";
import { contentActorOf, expireListing, setListingRegisterStatus } from "./listing";
import { auditContextOf } from "@/lib/cases/internal";

export interface LinkResult {
  linkId: string;
  lostStatus: string;
  foundStatus: string;
  lostReference: string;
  foundReference: string;
}

/**
 * Links `lostCaseId` and `foundCaseId` as a possible match. Refuses (with
 * `invalid`) a pair that is already linked or cases of the wrong kind, and
 * (`invalid_transition`) a lost report or found item that has moved on (for
 * example already ready to collect for someone else).
 */
export async function markPossibleMatch(
  db: AuditExecutor,
  input: { lostCaseId: string; foundCaseId: string; score?: number | null },
  actor: StaffActor,
  opts: { now?: Date } = {},
): Promise<LinkResult> {
  const now = opts.now ?? new Date();
  const result = await db.transaction(async (tx) => {
    const lost = await getCase(tx, input.lostCaseId, actor);
    const found = await getCase(tx, input.foundCaseId, actor);
    if (lost.service !== "lost_found" || lost.kind !== "lost" || found.service !== "lost_found" || found.kind !== "found") {
      throw new CaseError("invalid", "A match links a lost report to a found item.");
    }
    if (!(MATCHABLE_LOST_STATUSES as readonly string[]).includes(lost.status) || !([...MATCHABLE_FOUND_STATUSES, "claim_pending"] as string[]).includes(found.status)) {
      throw new CaseError("invalid_transition", "One of these cases can no longer be matched.");
    }

    const [existing] = await tx
      .select()
      .from(lostFoundCaseLinks)
      .where(and(eq(lostFoundCaseLinks.lostCaseId, lost.id), eq(lostFoundCaseLinks.foundCaseId, found.id)));
    if (existing && existing.status !== "dismissed") throw new CaseError("invalid", "These two are already linked.");
    const score = input.score == null ? null : Math.max(0, Math.min(100, Math.round(input.score)));

    let linkId: string;
    await withAudit(tx, auditContextOf(actor), async (inner, audit) => {
      if (existing) {
        await inner
          .update(lostFoundCaseLinks)
          .set({ status: "possible", score, createdBy: actor.userId, updatedAt: now })
          .where(eq(lostFoundCaseLinks.id, existing.id));
        linkId = existing.id;
      } else {
        const [created] = await inner
          .insert(lostFoundCaseLinks)
          .values({ lostCaseId: lost.id, foundCaseId: found.id, status: "possible", score, createdBy: actor.userId, createdAt: now, updatedAt: now })
          .returning({ id: lostFoundCaseLinks.id });
        linkId = created!.id;
      }
      await audit({ action: "lost_found.match_link", entityType: "case", entityId: lost.id, after: { lost: lost.reference, found: found.reference, score } });
    });

    await advanceTo(tx, lost.id, "match_found", actor, { now });
    await advanceTo(tx, found.id, "claim_pending", actor, { now });
    const suffix = score === null ? "" : ` (score ${score})`;
    await addNote(tx, lost.id, `Linked to found item ${found.reference} as a possible match${suffix}.`, actor, { now });
    await addNote(tx, found.id, `Linked to lost report ${lost.reference} as a possible match${suffix}.`, actor, { now });
    const content = contentActorOf(actor);
    await setListingRegisterStatus(tx, lost.id, "matched", content, now);
    await setListingRegisterStatus(tx, found.id, "matched", content, now);

    return {
      linkId: linkId!,
      lostStatus: "match_found",
      foundStatus: "claim_pending",
      lostReference: lost.reference,
      foundReference: found.reference,
    };
  });
  await expireListing(db, input.lostCaseId);
  await expireListing(db, input.foundCaseId);
  return result;
}

/** The lost reports linked to a found item, and the found items linked to a lost report. */
export async function linkedCases(db: AuditExecutor, caseId: string, kind: "lost" | "found"): Promise<Array<{ linkId: string; caseId: string; status: string; score: number | null }>> {
  const rows = await db
    .select()
    .from(lostFoundCaseLinks)
    .where(kind === "lost" ? eq(lostFoundCaseLinks.lostCaseId, caseId) : eq(lostFoundCaseLinks.foundCaseId, caseId));
  return rows.map((r) => ({ linkId: r.id, caseId: kind === "lost" ? r.foundCaseId : r.lostCaseId, status: r.status, score: r.score }));
}
