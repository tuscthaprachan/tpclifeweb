/**
 * Finishing a journey: the one place that turns saved answers into a
 * complaint. The journey row is locked first (lib/journeys/store.ts), so a
 * double click or a second tab cannot create two complaints: the second caller
 * finds the result already there and gets the same one back.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/journeys/store";
import { complaintStore, type JourneyResult } from "./store";
import { submitComplaint, type SubmitContext } from "./submit";

export { JourneyTooFastError, MIN_JOURNEY_MS };

/**
 * Submits the journey `id` once. Returns the stored result if it was already
 * submitted. Throws `JourneyInvalidError`, `ComplaintError`, `JourneyTooFastError`,
 * `PiiUnavailableError`; nothing is written then.
 */
export function finishJourney(db: AuditExecutor, id: string, ctx: SubmitContext, opts: { now?: Date; env?: PiiEnv } = {}): Promise<JourneyResult> {
  return complaintStore.finish(
    db,
    id,
    async (tx, data, now) => {
      const outcome = await submitComplaint(tx, data.values, ctx, { journeyId: id, now, env: opts.env });
      return {
        reference: outcome.reference,
        token: outcome.token,
        email: data.values.identity !== "anonymous" ? data.values.email || null : null,
        emailed: false,
        categoryKey: outcome.categoryKey,
        identity: data.values.identity as JourneyResult["identity"],
      };
    },
    opts,
  );
}
