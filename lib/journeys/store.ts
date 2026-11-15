/**
 * Journey state between question pages, kept on the server so it works with
 * JavaScript off and so personal data never sits in a URL or a large cookie.
 * One factory serves the complaint, borrowing and lost and found journeys.
 *
 * The browser holds one random token in an httpOnly cookie (./cookies.ts).
 * Here the token is hashed to find a row, whose answers are AES-256-GCM
 * ciphertext (lib/crypto/pii.ts) bound to the row id. In-progress rows live
 * two hours from the last save; the page that shows the private tracking link
 * lives thirty minutes. Expired rows are swept whenever a new journey starts.
 *
 * Every change goes through `update`, which locks the row, so two tabs or a
 * page view and a post cannot overwrite each other.
 */

import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, lte } from "drizzle-orm";
import { decryptPii, encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintJourneyFiles, complaintJourneys } from "@/lib/db/schema/complaints";
import { borrowingJourneys } from "@/lib/db/schema/borrowing";
import type { JourneyMetricKind } from "@/lib/db/schema/journey-metrics";
import { lostFoundJourneys } from "@/lib/db/schema/lost-found-cases";
import { recordJourneyFinish, recordJourneyStart } from "@/lib/performance/journeys";
import type { Storage } from "@/lib/storage";

export const JOURNEY_TTL_MS = 2 * 60 * 60 * 1000;
export const RESULT_TTL_MS = 30 * 60 * 1000;

/** Answers must have sat on the page at least this long. A script that posts instantly never read it. */
export const MIN_JOURNEY_MS = 3000;

export class JourneyTooFastError extends Error {
  constructor() {
    super("The journey was submitted faster than a person could have filled it in.");
    this.name = "JourneyTooFastError";
  }
}

/** What every journey blob holds, whatever the service. */
export interface StoredJourney<R = unknown> {
  v: number;
  startedAt: string;
  values: unknown;
  flash?: unknown;
  result?: R;
}

export interface LoadedJourney<D> {
  id: string;
  data: D;
}

/** The row as it was under the lock, and as it is now. */
export interface UpdatedJourney<D> {
  id: string;
  before: D;
  data: D;
}

type JourneyTable = typeof complaintJourneys | typeof borrowingJourneys | typeof lostFoundJourneys;

export interface JourneyStoreConfig<D extends StoredJourney<R>, R, I> {
  table: JourneyTable;
  /** The ciphertext binding for a row id. */
  aad: (id: string) => string;
  /** The kind counted on /performance, and stored in the row's `journey` column when the table has one. */
  kind: (input: I) => JourneyMetricKind;
  /** Rows older than this since the last save are gone. */
  ttlMs?: number;
  /** The same, once the journey has a result. */
  resultTtlMs?: number;
  /** The data of a new journey. */
  empty: (input: I, now: Date) => D;
  /** The answers of a journey that has been sent: nothing, so only the result stays. */
  blank: () => D["values"];
  /** Reads a decrypted blob: fills fields added since it was saved, or returns null when it is not usable. `kind` is the row's `journey` column. */
  migrate: (raw: unknown, kind: string | undefined) => D | null;
  /** Uploaded files that go with a journey and are deleted with it. */
  files?: { table: typeof complaintJourneyFiles; label: string };
}

export interface StoreOptions {
  now?: Date;
  env?: PiiEnv;
}

export function hashJourneyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Builds the store of one journey service. */
export function createJourneyStore<D extends StoredJourney<R>, R, I>(config: JourneyStoreConfig<D, R, I>) {
  const ttlMs = config.ttlMs ?? JOURNEY_TTL_MS;
  const resultTtlMs = config.resultTtlMs ?? RESULT_TTL_MS;
  const t = config.table as typeof lostFoundJourneys;
  const hasKind = "journey" in config.table;

  function read(row: { id: string; dataEnc: string; journey?: string }, env: PiiEnv | undefined): D | null {
    try {
      return config.migrate(JSON.parse(decryptPii(row.dataEnc, config.aad(row.id), env)), row.journey);
    } catch {
      return null;
    }
  }

  const seal = (id: string, data: D, env: PiiEnv | undefined) => encryptPii(JSON.stringify(data), config.aad(id), env);

  /**
   * Deletes journeys past their expiry and the files uploaded to them. Files
   * are deleted from storage first; if storage cannot be reached the journey
   * stays and is tried again next time, so no file is left without a record.
   */
  async function sweep(db: AuditExecutor, now: Date = new Date(), getStorage?: () => Storage): Promise<number> {
    const expired = await db.select({ id: t.id }).from(t).where(lte(t.expiresAt, now));
    if (expired.length === 0) return 0;
    const ids = expired.map((j) => j.id);
    if (config.files) {
      const files = await db.select({ key: complaintJourneyFiles.storageKey }).from(complaintJourneyFiles).where(inArray(complaintJourneyFiles.journeyId, ids));
      if (files.length > 0) {
        try {
          const storage = getStorage?.();
          if (!storage) return 0;
          for (const file of files) await storage.delete(file.key);
        } catch (error) {
          console.error(`[${config.files.label}] could not delete files of expired journeys`, error instanceof Error ? error.message : error);
          return 0;
        }
      }
    }
    const gone = await db.delete(t).where(inArray(t.id, ids)).returning({ id: t.id });
    return gone.length;
  }

  /** Starts a journey and returns the token for the cookie. Throws `PiiUnavailableError` without an encryption key. */
  async function start(db: AuditExecutor, input: I, opts: StoreOptions & { getStorage?: () => Storage } = {}): Promise<{ token: string; id: string }> {
    const now = opts.now ?? new Date();
    await sweep(db, now, opts.getStorage);
    const id = crypto.randomUUID();
    const token = randomBytes(32).toString("base64url");
    const kind = config.kind(input);
    const row = {
      id,
      tokenHash: hashJourneyToken(token),
      journey: kind,
      dataEnc: seal(id, config.empty(input, now), opts.env),
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    };
    // Only lost and found has a `journey` column; the other tables ignore the key.
    if (!hasKind) delete (row as Partial<typeof row>).journey;
    await db.insert(t).values(row);
    // A count for the completion rate on /performance: the kind and the time, nothing about the person.
    await recordJourneyStart(db, id, kind, now);
    return { token, id };
  }

  /** The journey a cookie token points to, or null if there is none, it expired, or it does not belong to `kind`. */
  async function load(db: AuditExecutor, token: string | undefined, opts: StoreOptions & { kind?: string } = {}): Promise<LoadedJourney<D> | null> {
    if (!token || token.length > 100) return null;
    const now = opts.now ?? new Date();
    const [row] = await db.select().from(t).where(eq(t.tokenHash, hashJourneyToken(token)));
    if (!row || row.expiresAt <= now) return null;
    if (hasKind && opts.kind !== undefined && row.journey !== opts.kind) return null;
    const data = read(row, opts.env);
    return data ? { id: row.id, data } : null;
  }

  /**
   * Changes a journey under a row lock: reads it, applies the pure `mutate`,
   * and writes the result, so concurrent updates are applied one after the
   * other and none is lost. Returning the same object writes nothing. The
   * clock restarts on a write (the result length once there is a result).
   * Returns null when the journey is gone or expired.
   */
  async function update(
    db: AuditExecutor,
    id: string,
    mutate: (data: D) => D,
    opts: StoreOptions & { ttlMs?: number } = {},
  ): Promise<UpdatedJourney<D> | null> {
    const now = opts.now ?? new Date();
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(t).where(eq(t.id, id)).for("update");
      if (!row || row.expiresAt <= now) return null;
      const before = read(row, opts.env);
      if (!before) return null;
      const data = mutate(before);
      if (data !== before) {
        const ttl = opts.ttlMs ?? (data.result ? resultTtlMs : ttlMs);
        await tx.update(t).set({ dataEnc: seal(id, data, opts.env), updatedAt: now, expiresAt: new Date(now.getTime() + ttl) }).where(eq(t.id, id));
      }
      return { id, before, data };
    });
  }

  /** Replaces a journey's data under the same lock. For setting a journey up; page code uses `update`. */
  async function save(db: AuditExecutor, id: string, data: D, opts: StoreOptions & { ttlMs?: number } = {}): Promise<void> {
    await update(db, id, () => data, opts);
  }

  async function remove(db: AuditExecutor, id: string): Promise<void> {
    await db.delete(t).where(eq(t.id, id));
  }

  /**
   * Finishing a journey: the one place that turns saved answers into a case.
   * The row is locked first, so a double click or a second tab cannot create
   * two: the second caller finds the result already there and gets the same
   * one back. `submit` runs inside the transaction; nothing is written when
   * it throws. Throws `JourneyTooFastError` for answers sent too quickly.
   */
  async function finish(db: AuditExecutor, id: string, submit: (tx: AuditExecutor, data: D, now: Date) => Promise<R>, opts: StoreOptions = {}): Promise<R> {
    const now = opts.now ?? new Date();
    return db.transaction(async (tx) => {
      const [row] = await tx.select().from(t).where(eq(t.id, id)).for("update");
      if (!row || row.expiresAt <= now) throw new Error("The journey has expired.");
      const data = read(row, opts.env);
      if (!data) throw new Error("The journey could not be read.");
      if (data.result) return data.result;
      if (now.getTime() - new Date(data.startedAt).getTime() < MIN_JOURNEY_MS) throw new JourneyTooFastError();
      const result = await submit(tx, data, now);
      await recordJourneyFinish(tx, id, now);
      // The answers are no longer needed: keep only what the confirmation page shows.
      const next: D = { ...data, values: config.blank(), flash: undefined, result };
      await tx.update(t).set({ dataEnc: seal(id, next, opts.env), updatedAt: now, expiresAt: new Date(now.getTime() + resultTtlMs) }).where(eq(t.id, id));
      return result;
    });
  }

  return { start, load, update, save, remove, sweep, finish };
}

export type JourneyStore<D extends StoredJourney<R>, R, I> = ReturnType<typeof createJourneyStore<D, R, I>>;
