/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 *
 * The browser holds one random token in an httpOnly cookie (./cookies.ts).
 * Here the token is hashed to find a row in `borrowing_journeys`, whose
 * answers are AES-256-GCM ciphertext (lib/crypto/pii.ts) bound to the row id.
 * In-progress rows live two hours from the last save; the page that shows the
 * private tracking link lives thirty minutes. Expired rows are swept whenever
 * a new journey starts.
 */

import { createHash, randomBytes } from "node:crypto";
import { eq, lte } from "drizzle-orm";
import { decryptPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingJourneys } from "@/lib/db/schema/borrowing";
import type { Locale } from "@/lib/i18n/config";
import { recordJourneyStart } from "@/lib/performance/journeys";
import { journeyAad } from "../aad";
import type { DraftValues } from "./steps";
import { emptyValues, type FieldErrors } from "./validate";

export const JOURNEY_TTL_MS = 2 * 60 * 60 * 1000;
export const RESULT_TTL_MS = 30 * 60 * 1000;

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

export interface LoadedJourney {
  id: string;
  data: JourneyData;
}

export function hashJourneyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Deletes journeys past their expiry. */
export async function sweepExpiredJourneys(db: AuditExecutor, now: Date = new Date()): Promise<number> {
  const gone = await db.delete(borrowingJourneys).where(lte(borrowingJourneys.expiresAt, now)).returning({ id: borrowingJourneys.id });
  return gone.length;
}

/** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
export async function startJourney(db: AuditExecutor, input: { locale: Locale }, opts: { now?: Date; env?: PiiEnv } = {}): Promise<{ token: string; id: string }> {
  const now = opts.now ?? new Date();
  await sweepExpiredJourneys(db, now);
  const id = crypto.randomUUID();
  const token = randomBytes(32).toString("base64url");
  const data: JourneyData = { v: 1, locale: input.locale, startedAt: now.toISOString(), values: emptyValues() };
  await db.insert(borrowingJourneys).values({
    id,
    tokenHash: hashJourneyToken(token),
    dataEnc: encryptPii(JSON.stringify(data), journeyAad(id), opts.env),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + JOURNEY_TTL_MS),
  });
  // A count for the completion rate on /performance: the kind and the time, nothing about the person.
  await recordJourneyStart(db, id, "borrow", now);
  return { token, id };
}

/** The journey a cookie token points to, or null if there is none or it expired. */
export async function loadJourney(db: AuditExecutor, token: string | undefined, opts: { now?: Date; env?: PiiEnv } = {}): Promise<LoadedJourney | null> {
  if (!token || token.length > 100) return null;
  const now = opts.now ?? new Date();
  const [row] = await db.select().from(borrowingJourneys).where(eq(borrowingJourneys.tokenHash, hashJourneyToken(token)));
  if (!row || row.expiresAt <= now) return null;
  try {
    const data = JSON.parse(decryptPii(row.dataEnc, journeyAad(row.id), opts.env)) as JourneyData;
    if (data.v !== 1) return null;
    return { id: row.id, data: { ...data, values: { ...emptyValues(), ...data.values } } };
  } catch {
    return null;
  }
}

/** Writes the journey back. `ttlMs` restarts the clock (default: in-progress length). */
export async function saveJourney(db: AuditExecutor, id: string, data: JourneyData, opts: { now?: Date; env?: PiiEnv; ttlMs?: number } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await db
    .update(borrowingJourneys)
    .set({ dataEnc: encryptPii(JSON.stringify(data), journeyAad(id), opts.env), updatedAt: now, expiresAt: new Date(now.getTime() + (opts.ttlMs ?? JOURNEY_TTL_MS)) })
    .where(eq(borrowingJourneys.id, id));
}
