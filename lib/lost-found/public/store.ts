/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 *
 * The browser holds one random token in an httpOnly cookie (app side:
 * ./cookies.ts). Here the token is hashed to find a row in
 * `lost_found_journeys`, whose answers are AES-256-GCM ciphertext
 * (lib/crypto/pii.ts) bound to the row id. In-progress rows live two hours
 * from the last save; the page that shows the private tracking link lives
 * thirty minutes. Expired rows are swept whenever a new journey starts.
 */

import { createHash, randomBytes } from "node:crypto";
import { eq, lte } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundJourneys } from "@/lib/db/schema/lost-found-cases";
import { decryptPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { recordJourneyStart } from "@/lib/performance/journeys";
import type { Locale } from "@/lib/i18n/config";
import type { UiKey } from "@/lib/i18n/strings";
import { emptyValues } from "./validate";
import type { DraftValues, JourneyKind } from "./steps";

export const JOURNEY_TTL_MS = 2 * 60 * 60 * 1000;
export const RESULT_TTL_MS = 30 * 60 * 1000;

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

export interface LoadedJourney {
  id: string;
  data: JourneyData;
}

export function hashJourneyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const aad = (id: string) => `lost_found_journeys:data:${id}`;

/** Deletes journeys past their expiry. Returns how many. */
export async function sweepExpiredJourneys(db: AuditExecutor, now: Date = new Date()): Promise<number> {
  const gone = await db.delete(lostFoundJourneys).where(lte(lostFoundJourneys.expiresAt, now)).returning({ id: lostFoundJourneys.id });
  return gone.length;
}

/** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
export async function startJourney(
  db: AuditExecutor,
  input: { kind: JourneyKind; locale: Locale; slug?: string },
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<{ token: string; id: string }> {
  const now = opts.now ?? new Date();
  await sweepExpiredJourneys(db, now);
  const id = crypto.randomUUID();
  const token = randomBytes(32).toString("base64url");
  const data: JourneyData = { v: 1, kind: input.kind, locale: input.locale, ...(input.slug ? { slug: input.slug } : {}), startedAt: now.toISOString(), values: emptyValues() };
  await db.insert(lostFoundJourneys).values({
    id,
    tokenHash: hashJourneyToken(token),
    journey: input.kind,
    dataEnc: encryptPii(JSON.stringify(data), aad(id), opts.env),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + JOURNEY_TTL_MS),
  });
  // A count for the completion rate on /performance: the kind and the time, nothing about the person.
  await recordJourneyStart(db, id, input.kind, now);
  return { token, id };
}

/** The journey a cookie token points to, or null if there is none, it expired, or it does not belong to `kind`. */
export async function loadJourney(
  db: AuditExecutor,
  token: string | undefined,
  kind: JourneyKind,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<LoadedJourney | null> {
  if (!token || token.length > 100) return null;
  const now = opts.now ?? new Date();
  const [row] = await db.select().from(lostFoundJourneys).where(eq(lostFoundJourneys.tokenHash, hashJourneyToken(token)));
  if (!row || row.journey !== kind || row.expiresAt <= now) return null;
  try {
    const data = JSON.parse(decryptPii(row.dataEnc, aad(row.id), opts.env)) as JourneyData;
    if (data.v !== 1 || data.kind !== kind) return null;
    return { id: row.id, data };
  } catch {
    return null;
  }
}

/** Writes the journey back. `ttlMs` restarts the clock (default: in-progress length). */
export async function saveJourney(
  db: AuditExecutor,
  id: string,
  data: JourneyData,
  opts: { now?: Date; env?: PiiEnv; ttlMs?: number } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
  await db
    .update(lostFoundJourneys)
    .set({ dataEnc: encryptPii(JSON.stringify(data), aad(id), opts.env), updatedAt: now, expiresAt: new Date(now.getTime() + (opts.ttlMs ?? JOURNEY_TTL_MS)) })
    .where(eq(lostFoundJourneys.id, id));
}

export async function deleteJourney(db: AuditExecutor, id: string): Promise<void> {
  await db.delete(lostFoundJourneys).where(eq(lostFoundJourneys.id, id));
}
