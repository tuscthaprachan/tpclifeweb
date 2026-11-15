/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 *
 * The browser holds one random token in an httpOnly cookie (./cookies.ts).
 * Here the token is hashed to find a row in `complaint_journeys`, whose
 * answers are AES-256-GCM ciphertext (lib/crypto/pii.ts) bound to the row id.
 * In-progress rows live two hours from the last save; the page that shows the
 * private tracking link lives thirty minutes. Expired rows are swept whenever
 * a new journey starts, and their uploaded files are deleted with them.
 * The mechanics are shared (lib/journeys/store.ts); this file holds what is
 * specific to complaints.
 */

import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintJourneyFiles, complaintJourneys, type ComplaintIdentity } from "@/lib/db/schema/complaints";
import type { Locale } from "@/lib/i18n/config";
import type { UiKey } from "@/lib/i18n/strings";
import { createJourneyStore, hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS, type LoadedJourney as Loaded } from "@/lib/journeys/store";
import type { Storage } from "@/lib/storage";
import { journeyAad } from "../aad";
import type { DraftValues } from "./steps";
import { emptyValues } from "./validate";

export { hashJourneyToken, JOURNEY_TTL_MS, RESULT_TTL_MS };

/** What a submitted journey leaves for the confirmation page. */
export interface JourneyResult {
  reference: string;
  /** The private tracking token, shown once. */
  token: string;
  /** For the optional "email me the link" button. Held only until the result expires. */
  email: string | null;
  emailed: boolean;
  categoryKey: string;
  identity: ComplaintIdentity;
}

export interface JourneyFlash {
  step: string;
  errors: Partial<Record<string, UiKey>>;
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

export const complaintStore = createJourneyStore<JourneyData, JourneyResult, { locale: Locale }>({
  table: complaintJourneys,
  aad: journeyAad,
  kind: () => "complaint",
  empty: ({ locale }, now) => ({ v: 1, locale, startedAt: now.toISOString(), values: emptyValues() }),
  blank: emptyValues,
  // A draft saved before the triage questions existed has no such answers: they read as not answered.
  migrate: (raw) => {
    const data = raw as JourneyData;
    return data.v === 1 ? { ...data, values: { ...emptyValues(), ...data.values } } : null;
  },
  files: { table: complaintJourneyFiles, label: "complaints" },
});

/** Deletes journeys past their expiry and the files uploaded to them. */
export const sweepExpiredJourneys = (db: AuditExecutor, now: Date = new Date(), getStorage?: () => Storage) => complaintStore.sweep(db, now, getStorage);

/** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
export const startJourney = (db: AuditExecutor, input: { locale: Locale }, opts: { now?: Date; env?: PiiEnv; getStorage?: () => Storage } = {}) => complaintStore.start(db, input, opts);

/** The journey a cookie token points to, or null if there is none or it expired. */
export const loadJourney = (db: AuditExecutor, token: string | undefined, opts: { now?: Date; env?: PiiEnv } = {}) => complaintStore.load(db, token, opts);

/** Replaces the journey's data under the row lock. Pages and actions use `complaintStore.update`. */
export const saveJourney = (db: AuditExecutor, id: string, data: JourneyData, opts: { now?: Date; env?: PiiEnv; ttlMs?: number } = {}) => complaintStore.save(db, id, data, opts);
