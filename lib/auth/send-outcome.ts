/**
 * Better Auth runs `sendVerificationOTP` as a background task and swallows
 * its errors, so the endpoint reports success even when no email went out.
 * `captureSendFailure` runs a request with a slot the sender fills on failure,
 * so the caller can tell the person instead of leaving them waiting.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const slot = new AsyncLocalStorage<{ error?: unknown }>();

export function reportSendFailure(error: unknown): void {
  const store = slot.getStore();
  if (store) store.error = error;
}

export async function captureSendFailure<T>(run: () => Promise<T>): Promise<{ result: T; error?: unknown }> {
  const store: { error?: unknown } = {};
  const result = await slot.run(store, run);
  return { result, error: store.error };
}
