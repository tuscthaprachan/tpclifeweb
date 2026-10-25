/**
 * Refusals specific to complaints. Engine refusals (`forbidden`, `not_found`,
 * `invalid_transition`, `stale`, `pii_deleted`) stay `CaseError`; these are the
 * extra ones. The `code` is stable; the message is for logs, not for people.
 */

export type ComplaintErrorCode =
  /** The reopen window has passed. */
  | "window_closed"
  /** A change that widens who can see a complaint needs an explicit yes. */
  | "needs_confirm"
  | "invalid"
  | "already";

export class ComplaintError extends Error {
  constructor(
    readonly code: ComplaintErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ComplaintError";
  }
}
