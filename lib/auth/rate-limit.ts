/**
 * A small fixed-window counter in Postgres, used by the sign-in Server Actions.
 *
 * Why this exists next to Better Auth's limiter: Better Auth only rate-limits
 * requests that arrive through its HTTP handler. Our forms call `auth.api.*`
 * directly from Server Actions (so they work without JavaScript), and those
 * calls skip the limiter. Both write to the same `rate_limit` table, ours under
 * an `app:` key prefix.
 *
 * Why the database and not memory: on Vercel each request may run on a different
 * instance that forgets everything, so an in-memory counter limits nothing.
 */

import { sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";

export interface RateRule {
  /** Window length in seconds. */
  windowSeconds: number;
  max: number;
}

export interface RateResult {
  allowed: boolean;
  /** Seconds until the window resets (only meaningful when not allowed). */
  retryAfterSeconds: number;
}

/**
 * Counts one hit against `key` and says whether it is within the rule. The
 * upsert is a single atomic statement, so concurrent requests cannot both slip
 * under the limit. `last_request` holds the start of the current window.
 */
export async function consumeRateLimit(
  db: AuditExecutor,
  key: string,
  rule: RateRule,
  now: number = Date.now(),
): Promise<RateResult> {
  const windowMs = rule.windowSeconds * 1000;
  const result = await db.execute(sql`
    insert into rate_limit (id, key, count, last_request)
    values (${crypto.randomUUID()}, ${`app:${key}`}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limit.last_request <= ${now - windowMs} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request <= ${now - windowMs} then ${now} else rate_limit.last_request end
    returning count, last_request
  `);
  const row = (result as unknown as { rows: Array<{ count: number | string; last_request: number | string }> }).rows[0];
  if (!row) throw new Error("Rate limit upsert returned no row.");
  const count = Number(row.count);
  const windowStart = Number(row.last_request);
  if (count <= rule.max) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) };
}
