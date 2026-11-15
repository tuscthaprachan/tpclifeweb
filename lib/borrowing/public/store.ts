/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 *
 * The browser holds one random token in an httpOnly cookie (./cookies.ts).
 * Here the token is hashed to find a row in `borrowing_journeys`, whose
 * answers are AES-256-GCM ciphertext (lib/crypto/pii.ts) bound to the row id.
 * In-progress rows live two hours from the last save; the page that shows the
 * private tracking link lives thirty minutes. Expired rows are swept whenever
 * a new journey starts. The mechanics are shared (lib/journeys/store.ts); this
 * file holds what is specific to borrowing.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingJourneys } from "@/lib/db/schema/borrowing";
import type { Locale } from "@/lib/i18n/config";
import { createJourneyStore, hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS, type LoadedJourney as Loaded } from "@/lib/journeys/store";
import { journeyAad } from "../aad";
import type { DraftValues } from "./steps";
import { emptyValues, type FieldErrors } from "./validate";

export { hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS };

/** What a submitted journey leaves for the confirmation page. */
export interface JourneyResult {
  reference: string;
  /** The private tracking token, shown once. */
  token: string;
  /** For the optional "email me the link" button. Held only until the result expires. */
  email: string | null;
  emailed: boolean;
  /** When the equipment is collected, as an ISO instant. */
  collectAt: string;
  /** Original cards to bring at collection. */
  cards: number;
}

export interface JourneyFlash {
  step: string;
  errors: FieldErrors;
}

export interface JourneyData {
  v: 1;
  locale: Locale;
  startedAt: string;
  values: DraftValues;
  /** Errors from the last rejected submission, shown once on the page they belong to. */
  flash?: JourneyFlash;
  result?: JourneyResult;
}

export type LoadedJourney = Loaded<JourneyData>;

export const borrowingStore = createJourneyStore<JourneyData, JourneyResult, { locale: Locale }>({
  table: borrowingJourneys,
  aad: journeyAad,
  kind: () => "borrow",
  empty: ({ locale }, now) => ({ v: 1, locale, startedAt: now.toISOString(), values: emptyValues() }),
  blank: emptyValues,
  migrate: (raw) => {
    const data = raw as JourneyData;
    return data.v === 1 ? { ...data, values: { ...emptyValues(), ...data.values } } : null;
  },
});

/** Deletes journeys past their expiry. */
export const sweepExpiredJourneys = (db: AuditExecutor, now: Date = new Date()) => borrowingStore.sweep(db, now);

/** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
export const startJourney = (db: AuditExecutor, input: { locale: Locale }, opts: { now?: Date; env?: PiiEnv } = {}) => borrowingStore.start(db, input, opts);

/** The journey a cookie token points to, or null if there is none or it expired. */
export const loadJourney = (db: AuditExecutor, token: string | undefined, opts: { now?: Date; env?: PiiEnv } = {}) => borrowingStore.load(db, token, opts);

/** Replaces the journey's data under the row lock. Pages and actions use `borrowingStore.update`. */
export const saveJourney = (db: AuditExecutor, id: string, data: JourneyData, opts: { now?: Date; env?: PiiEnv; ttlMs?: number } = {}) => borrowingStore.save(db, id, data, opts);
