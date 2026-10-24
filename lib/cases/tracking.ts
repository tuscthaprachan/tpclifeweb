/**
 * Private tracking links. A person tracks their case with its reference plus a
 * link only they were given. The link carries a random 256 bit token; the
 * database stores only its SHA-256, so a leaked database cannot be used to
 * track cases. Lookup is by hash (an indexed equality on a value the caller
 * cannot predict), and the stored hash is then compared in constant time.
 *
 * Resolving never says why it failed (unknown reference, wrong token, expired,
 * revoked all return null). Count attempts per address with
 * `consumeTrackingAttempt` before calling it from a public page.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { consumeRateLimit, type RateResult, type RateRule } from "@/lib/auth/rate-limit";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { caseAccessTokens, cases, type CaseService } from "@/lib/db/schema/cases";
import { appendEvent, assertStaff, auditContextOf, lockCase } from "./internal";
import type { CaseActor } from "./types";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 20 guesses per address per 15 minutes. */
export const TRACKING_RATE_RULE: RateRule = { windowSeconds: 15 * 60, max: 20 };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Counts one tracking attempt against `key` (for example `track:<ip>`). Refuse the request when `allowed` is false. */
export function consumeTrackingAttempt(db: AuditExecutor, key: string, now?: number): Promise<RateResult> {
  return consumeRateLimit(db, `track:${key}`, TRACKING_RATE_RULE, now);
}

export interface IssuedTrackingLink {
  /** Shown once, never stored. Put it in the link or email. */
  token: string;
  expiresAt: Date | null;
}

/**
 * Makes a new link for a case. Earlier links keep working until revoked. Any
 * actor may issue one (the journey issues it for a new report); the token is
 * the only secret, so only hand it to the person concerned.
 */
export async function issueTrackingLink(
  db: AuditExecutor,
  caseId: string,
  actor: CaseActor,
  opts: { expiresAt?: Date | null; now?: Date } = {},
): Promise<IssuedTrackingLink> {
  const now = opts.now ?? new Date();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = opts.expiresAt ?? null;
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (actor.kind === "staff") assertStaff(actor, row.service);
    await tx.insert(caseAccessTokens).values({ caseId, tokenHash: hashToken(token), createdAt: now, expiresAt });
    await appendEvent(tx, caseId, actor, now, { type: "tracking_link_issued" });
    await audit({ action: "case_link.issue", entityType: "case", entityId: caseId, after: { expiresAt: expiresAt?.toISOString() ?? null } });
  });
  return { token, expiresAt };
}

/** Revokes every live link for a case (staff only). Returns how many were revoked. */
export async function revokeTrackingLinks(db: AuditExecutor, caseId: string, actor: CaseActor, opts: { now?: Date } = {}): Promise<number> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    const revoked = await tx
      .update(caseAccessTokens)
      .set({ revokedAt: now })
      .where(and(eq(caseAccessTokens.caseId, caseId), isNull(caseAccessTokens.revokedAt)))
      .returning({ id: caseAccessTokens.id });
    if (revoked.length > 0) {
      await appendEvent(tx, caseId, actor, now, { type: "tracking_link_revoked", metadata: { count: revoked.length } });
      await audit({ action: "case_link.revoke", entityType: "case", entityId: caseId, after: { count: revoked.length } });
    }
    return revoked.length;
  });
}

export interface TrackedCase {
  id: string;
  reference: string;
  service: CaseService;
  kind: string;
  status: string;
}

/** The case a reference and link point to, or null for any kind of mismatch. */
export async function resolveTrackingLink(db: AuditExecutor, reference: string, token: string, now: Date = new Date()): Promise<TrackedCase | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const hash = hashToken(token);
  const [row] = await db
    .select({
      id: cases.id,
      reference: cases.reference,
      service: cases.service,
      kind: cases.kind,
      status: cases.status,
      tokenHash: caseAccessTokens.tokenHash,
      expiresAt: caseAccessTokens.expiresAt,
      revokedAt: caseAccessTokens.revokedAt,
    })
    .from(caseAccessTokens)
    .innerJoin(cases, eq(cases.id, caseAccessTokens.caseId))
    .where(eq(caseAccessTokens.tokenHash, hash));
  if (!row) return null;
  const stored = Buffer.from(row.tokenHash);
  const given = Buffer.from(hash);
  if (stored.length !== given.length || !timingSafeEqual(stored, given)) return null;
  if (row.reference !== reference.trim().toUpperCase()) return null;
  if (row.revokedAt || (row.expiresAt && row.expiresAt <= now)) return null;
  return { id: row.id, reference: row.reference, service: row.service, kind: row.kind, status: row.status };
}
