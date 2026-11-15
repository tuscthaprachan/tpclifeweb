/**
 * Work a service does inside the transaction of every status move, so a case's
 * dependent records cannot be left out of step by whichever path moved it (a
 * staff flow, the generic status form, the inbox bulk move or the person's own
 * tracking link). A service with no entry has nothing to keep in step.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import type { CaseService } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";
import { syncListingRegister } from "@/lib/lost-found/listing";
import type { GuardFacts } from "./services";
import type { CaseActor } from "./types";

export interface TransitionContext {
  caseId: string;
  kind: string;
  from: string;
  to: string;
  actor: CaseActor;
  now: Date;
}

export type TransitionHook = (tx: AuditExecutor, ctx: TransitionContext) => Promise<void>;

/** After-transition hooks by service. Lost and found keeps the public listing's register status in step with the case. */
export const AFTER_TRANSITION: Partial<Record<CaseService, TransitionHook>> = {
  lost_found: (tx, ctx) => syncListingRegister(tx, ctx.caseId, ctx.kind, ctx.to, ctx.actor, ctx.now),
};

/** Reads the facts a service's guards need, by service. A service with no entry has none. */
export const GUARD_FACTS: Partial<Record<CaseService, (tx: AuditExecutor, caseId: string) => Promise<GuardFacts>>> = {
  complaint: async (tx, caseId) => {
    const [row] = await tx.select({ resolvedAt: complaintCases.resolvedAt }).from(complaintCases).where(eq(complaintCases.caseId, caseId));
    return { resolvedAt: row?.resolvedAt ?? null };
  },
};

/** The guard facts for a case; empty facts for a service that has none. */
export async function loadGuardFacts(tx: AuditExecutor, service: CaseService, caseId: string): Promise<GuardFacts> {
  return (await GUARD_FACTS[service]?.(tx, caseId)) ?? { resolvedAt: null };
}
