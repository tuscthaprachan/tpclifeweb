/**
 * The emailing of the private link of a finished journey, sent once at submission, with a button to retry. The address
 * is held only in the journey result, and the link is sent at most once: the
 * result is marked as emailed inside the row lock before sending, so a double
 * click or a second tab finds it claimed. A failed send releases the claim so
 * the person can try again.
 */

import type { AuditExecutor } from "@/lib/db/audit";
import type { JourneyStore, StoreOptions, StoredJourney } from "./store";

/** What the button needs from a result. */
export interface EmailableResult {
  email: string | null;
  emailed: boolean;
}

/** `sent` and `failed` say what happened; `skipped` means there was nothing to send, or another request already sent it. */
export type EmailOutcome = "sent" | "failed" | "skipped";

export async function emailResultOnce<D extends StoredJourney<R>, R extends EmailableResult, I>(
  store: JourneyStore<D, R, I>,
  db: AuditExecutor,
  id: string,
  send: (result: R) => Promise<boolean>,
  opts: StoreOptions & { eligible?: (result: R) => boolean } = {},
): Promise<EmailOutcome> {
  const eligible = opts.eligible ?? (() => true);
  let claimed: R | null = null;
  await store.update(
    db,
    id,
    (data) => {
      claimed = null;
      const result = data.result;
      if (!result || result.emailed || !result.email || !eligible(result)) return data;
      claimed = result;
      return { ...data, result: { ...result, emailed: true } };
    },
    opts,
  );
  const result = claimed as R | null;
  if (!result) return "skipped";
  let sent = false;
  try {
    sent = await send(result);
  } catch {
    sent = false;
  }
  if (!sent) {
    await store.update(db, id, (data) => (data.result ? { ...data, result: { ...data.result, emailed: false } } : data), opts);
  }
  return sent ? "sent" : "failed";
}
