/**
 * Finishing a journey: the one place that turns saved answers into a loan
 * request. The journey row is locked first (lib/journeys/store.ts), so a double
 * click or a second tab cannot create two requests: the second caller finds
 * the result already there and gets the same one back.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/journeys/store";
import { borrowingStore, type JourneyResult } from "./store";
import { submitRequest, type SubmitContext } from "./submit";

export { JourneyTooFastError, MIN_JOURNEY_MS };

/**
 * Submits the journey `id` once. Returns the stored result if it was already
 * submitted. Throws `JourneyInvalidError`, `BorrowingError`, `JourneyTooFastError`,
 * `PiiUnavailableError`; nothing is written then.
 */
export function finishJourney(db: AuditExecutor, id: string, ctx: SubmitContext, opts: { now?: Date; env?: PiiEnv } = {}): Promise<JourneyResult> {
  return borrowingStore.finish(
    db,
    id,
    async (tx, data, now) => {
      const outcome = await submitRequest(tx, data.values, ctx, { now, env: opts.env });
      return {
        reference: outcome.reference,
        token: outcome.token,
        email: data.values.email || null,
        emailed: false,
        collectAt: outcome.collectAt.toISOString(),
        cards: outcome.cards,
      };
    },
    opts,
  );
}
