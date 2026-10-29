/**
 * Rules for equipment loans that are not per category. Desk hours and the
 * longest loan are assumptions until the TUSU desk confirms them (handoff.md).
 */

/** Statuses during which the equipment is promised or out, so it counts against availability. */
export const HOLDING_STATUSES = ["requested", "approved", "on_loan"] as const;

/** Statuses a borrower may still cancel from (before collection). */
export const CANCELLABLE_STATUSES = ["requested", "approved"] as const;

/** Collection and return times offered, Bangkok, every half hour within desk hours. */
export const DESK_OPENS = "09:00";
export const DESK_CLOSES = "17:00";
export const SLOT_MINUTES = 30;

/** The desk works Monday to Friday (0 = Sunday). */
export const DESK_DAYS: readonly number[] = [1, 2, 3, 4, 5];

/** The longest loan, in calendar days from collection to return. */
export const MAX_LOAN_DAYS = 14;

/** How far ahead a request may be made, in calendar days. */
export const MAX_ADVANCE_DAYS = 90;

/** How many different items one request may hold. */
export const MAX_LINES = 20;

/** Version of the shared terms wording (lib/borrowing/terms.ts). Bump when the wording changes. */
export const TERMS_VERSION = "2026-10";

/** The TUSU organisation slug: the desk that lends and is credited on new cases. */
export const LENDING_ORGANISATION_SLUG = "tusu";
