/**
 * Finishing a journey: the one place that turns saved answers into a case.
 * The journey row is locked first (lib/journeys/store.ts), so a double click or
 * a second tab cannot create two cases: the second caller finds the result
 * already there and gets the same one back.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/journeys/store";
import { lostFoundStore, type JourneyResult } from "./store";
import { submitClaim, submitReport, type SubmitContext } from "./submit";

export { JourneyTooFastError, MIN_JOURNEY_MS };

/**
 * Submits the journey `id` once. Returns the stored result if it was already
 * submitted. Throws `JourneyInvalidError`, `ClaimUnavailableError`,
 * `JourneyTooFastError`, `PiiUnavailableError`; nothing is written then.
 */
export function finishJourney(db: AuditExecutor, id: string, ctx: SubmitContext, opts: { now?: Date; env?: PiiEnv } = {}): Promise<JourneyResult> {
  return lostFoundStore.finish(
    db,
    id,
    async (tx, data) => {
      const outcome = data.kind === "claim" ? await submitClaim(tx, data.slug ?? "", data.values, ctx, opts) : await submitReport(tx, data.kind, data.values, ctx, opts);
      return { reference: outcome.reference, token: outcome.token, email: data.values.email || null, emailed: false };
    },
    opts,
  );
}
