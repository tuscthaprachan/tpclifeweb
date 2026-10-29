/**
 * Finishing a journey: the one place that turns saved answers into a loan
 * request. The journey row is locked first, so a double click or a second tab
 * cannot create two requests: the second caller finds the result already there
 * and gets the same one back.
 */

import { eq } from "drizzle-orm";
import { decryptPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingJourneys } from "@/lib/db/schema/borrowing";
import { recordJourneyFinish } from "@/lib/performance/journeys";
import { journeyAad } from "../aad";
import { RESULT_TTL_MS, type JourneyData, type JourneyResult } from "./store";
import { submitRequest, type SubmitContext } from "./submit";
import { emptyValues } from "./validate";

/** Answers must have sat on the page at least this long. A script that posts instantly never read it. */
export const MIN_JOURNEY_MS = 3000;

export class JourneyTooFastError extends Error {
  constructor() {
    super("The journey was submitted faster than a person could have filled it in.");
    this.name = "JourneyTooFastError";
  }
}

/**
 * Submits the journey `id` once. Returns the stored result if it was already
 * submitted. Throws `JourneyInvalidError`, `BorrowingError`, `JourneyTooFastError`,
 * `PiiUnavailableError`; nothing is written then.
 */
export async function finishJourney(db: AuditExecutor, id: string, ctx: SubmitContext, opts: { now?: Date; env?: PiiEnv } = {}): Promise<JourneyResult> {
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(borrowingJourneys).where(eq(borrowingJourneys.id, id)).for("update");
    if (!row || row.expiresAt <= now) throw new Error("The journey has expired.");
    const data = JSON.parse(decryptPii(row.dataEnc, journeyAad(id), opts.env)) as JourneyData;
    if (data.result) return data.result;
    if (now.getTime() - new Date(data.startedAt).getTime() < MIN_JOURNEY_MS) throw new JourneyTooFastError();

    const values = { ...emptyValues(), ...data.values };
    const outcome = await submitRequest(tx, values, ctx, { now, env: opts.env });
    await recordJourneyFinish(tx, id, now);
    const result: JourneyResult = {
      reference: outcome.reference,
      token: outcome.token,
      email: values.email || null,
      emailed: false,
      collectAt: outcome.collectAt.toISOString(),
      cards: outcome.cards,
    };
    // The answers are no longer needed: keep only what the confirmation page shows.
    const next: JourneyData = { ...data, values: emptyValues(), flash: undefined, result };
    await tx
      .update(borrowingJourneys)
      .set({ dataEnc: encryptPii(JSON.stringify(next), journeyAad(id), opts.env), updatedAt: now, expiresAt: new Date(now.getTime() + RESULT_TTL_MS) })
      .where(eq(borrowingJourneys.id, id));
    return result;
  });
}
