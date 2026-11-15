/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 *
 * The browser holds one random token in an httpOnly cookie (app side:
 * ./cookies.ts). Here the token is hashed to find a row in
 * `lost_found_journeys`, whose answers are AES-256-GCM ciphertext
 * (lib/crypto/pii.ts) bound to the row id. In-progress rows live two hours
 * from the last save; the page that shows the private tracking link lives
 * thirty minutes. Expired rows are swept whenever a new journey starts. The
 * mechanics are shared (lib/journeys/store.ts); this file holds what is
 * specific to lost and found.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundJourneys } from "@/lib/db/schema/lost-found-cases";
import type { Locale } from "@/lib/i18n/config";
import type { UiKey } from "@/lib/i18n/strings";
import { createJourneyStore, hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS, type LoadedJourney as Loaded } from "@/lib/journeys/store";
import type { DraftValues, JourneyKind } from "./steps";
import { emptyValues } from "./validate";

export { hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS };

/** What a submitted journey leaves for the confirmation page. */
export interface JourneyResult {
  reference: string;
  /** The private tracking token, shown on the confirmation page until the result expires. */
  token: string;
  /** For the optional "email me the link" button. Held only until the result expires. */
  email: string | null;
  emailed: boolean;
}

export interface JourneyFlash {
  step: string;
  errors: Partial<Record<string, UiKey>>;
}

export interface JourneyData {
  v: 1;
  kind: JourneyKind;
  locale: Locale;
  /** The found listing being claimed. */
  slug?: string;
  startedAt: string;
  values: DraftValues;
  /** Errors from the last rejected submission, shown once on the page they belong to. */
  flash?: JourneyFlash;
  result?: JourneyResult;
}

export type LoadedJourney = Loaded<JourneyData>;

export const lostFoundStore = createJourneyStore<JourneyData, JourneyResult, { kind: JourneyKind; locale: Locale; slug?: string }>({
  table: lostFoundJourneys,
  aad: (id) => `lost_found_journeys:data:${id}`,
  kind: (input) => input.kind,
  empty: ({ kind, locale, slug }, now) => ({ v: 1, kind, locale, ...(slug ? { slug } : {}), startedAt: now.toISOString(), values: emptyValues() }),
  blank: emptyValues,
  migrate: (raw, kind) => {
    const data = raw as JourneyData;
    return data.v === 1 && data.kind === kind ? { ...data, values: { ...emptyValues(), ...data.values } } : null;
  },
});

/** Deletes journeys past their expiry. Returns how many. */
export const sweepExpiredJourneys = (db: AuditExecutor, now: Date = new Date()) => lostFoundStore.sweep(db, now);

/** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
export const startJourney = (db: AuditExecutor, input: { kind: JourneyKind; locale: Locale; slug?: string }, opts: { now?: Date; env?: PiiEnv } = {}) => lostFoundStore.start(db, input, opts);

/** The journey a cookie token points to, or null if there is none, it expired, or it does not belong to `kind`. */
export const loadJourney = (db: AuditExecutor, token: string | undefined, kind: JourneyKind, opts: { now?: Date; env?: PiiEnv } = {}) => lostFoundStore.load(db, token, { ...opts, kind });

/** Replaces the journey's data under the row lock. Pages and actions use `lostFoundStore.update`. */
export const saveJourney = (db: AuditExecutor, id: string, data: JourneyData, opts: { now?: Date; env?: PiiEnv; ttlMs?: number } = {}) => lostFoundStore.save(db, id, data, opts);

export const deleteJourney = (db: AuditExecutor, id: string) => lostFoundStore.remove(db, id);
