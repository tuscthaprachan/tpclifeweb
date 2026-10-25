/**
 * Small helpers shared by the lost and found staff operations.
 */

import { eq } from "drizzle-orm";
import { transition } from "@/lib/cases/engine";
import { canTransition } from "@/lib/cases/services";
import { CaseError, type BilingualText, type StaffActor } from "@/lib/cases/types";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, organisations } from "@/lib/db/schema";
import type { OWNERS } from "@/lib/db/schema/content/enums";

/** Statuses in the order a case moves forward. A case is walked up this ladder one rung at a time, so every step is a transition its state machine allows and is audited. */
const LADDER = {
  lost: ["submitted", "searching", "match_found", "ready_to_collect", "returned"],
  found: ["logged", "listed", "claim_pending", "ready_to_collect", "returned"],
} as const;

type Owner = (typeof OWNERS)[number];

/** The listing's `owner` for a desk: its own body, or joint for anything else. */
export async function ownerFor(db: AuditExecutor, organisationId: number | null): Promise<Owner> {
  if (organisationId === null) return "joint";
  const [org] = await db.select({ slug: organisations.slug }).from(organisations).where(eq(organisations.id, organisationId));
  return org?.slug === "tusu" || org?.slug === "tusc" ? org.slug : "joint";
}

/**
 * Moves a case forward to `target`, through each status between. Returns the
 * statuses it passed through. Does nothing if the case is already at or past
 * `target` on the ladder; takes a direct move where the machine has one; throws `invalid_transition` if the machine refuses a
 * step (for example a withdrawn report). `note` is attached to the last step.
 */
export async function advanceTo(
  tx: AuditExecutor,
  caseId: string,
  target: string,
  actor: StaffActor,
  opts: { now: Date; note?: BilingualText } ,
): Promise<string[]> {
  const [row] = await tx.select({ kind: cases.kind, status: cases.status }).from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  const ladder = (LADDER as Record<string, readonly string[]>)[row.kind];
  if (!ladder) throw new CaseError("invalid", "Unknown kind.");
  const at = ladder.indexOf(row.status);
  const to = ladder.indexOf(target);
  if (at < 0) throw new CaseError("invalid_transition", `${row.status} cannot move to ${target}.`);
  if (to <= at) return [];
  const passed: string[] = [];
  let current = row.status;
  while (current !== target) {
    // Take the direct move when the machine has one (a found item can go from logged straight to claim_pending, without being listed first).
    const next = canTransition("lost_found", row.kind, current, target) ? target : ladder[ladder.indexOf(current) + 1]!;
    await transition(tx, caseId, next, actor, { now: opts.now, note: next === target ? opts.note : undefined });
    passed.push(next);
    current = next;
  }
  return passed;
}
