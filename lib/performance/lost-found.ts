/**
 * Lost and found measures, from SQL aggregates over `cases`. Nothing here
 * reads a contact, a description or any other personal field; a person is
 * only ever a count. Definitions are on the public page and in
 * lib/i18n/strings.ts (`perf` keys); keep them in step.
 *
 *   reports received    cases opened in the period, by kind (lost, found)
 *   items returned      found items handed back, closed in the period
 *   return rate         of found items logged in the period that are at least
 *                       30 days old, the share that have been returned.
 *                       Items removed from the register in error are left out
 *   median days         from the found item being logged to it being
 *                       returned, for items returned in the period
 *   online share        reports whose `created` event has no member of staff
 *                       on it (a person on a public journey), out of all
 *                       reports opened in the period. The rest were logged
 *                       at a desk
 */

import { sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import type { Range } from "./period";
import { countMeasure, measure, round1, shareMeasure, type Measure } from "./suppress";
import { num, numOrNull, queryOne, queryRows, within } from "./sql";

/** An item is judged on its return only once it has had this long. */
export const RETURN_RATE_MATURITY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LostFoundMeasures {
  lostReceived: Measure;
  foundReceived: Measure;
  returned: Measure;
  returnRate: Measure;
  medianDaysToReturn: Measure;
  onlineShare: Measure;
}

export async function lostFoundMeasures(db: AuditExecutor, range: Range): Promise<LostFoundMeasures> {
  const matureBefore = new Date(range.to.getTime() - RETURN_RATE_MATURITY_DAYS * DAY_MS).toISOString();

  const received = await queryRows<{ kind: string; n: number }>(
    db,
    sql`select kind, count(*)::int as n from ${cases} where service = 'lost_found' and ${within(cases.createdAt, range)} group by kind`,
  );
  const receivedOf = (kind: string) => num(received.find((r) => r.kind === kind)?.n);

  const returned = await queryOne<{ n: number; median: number | null }>(
    db,
    sql`select count(*)::int as n,
        (percentile_cont(0.5) within group (order by extract(epoch from (${cases.closedAt} - ${cases.createdAt})) / 86400.0))::float8 as median
      from ${cases}
      where service = 'lost_found' and kind = 'found' and status = 'returned' and ${cases.closedAt} is not null and ${within(cases.closedAt, range)}`,
  );

  const rate = await queryOne<{ base: number; ok: number }>(
    db,
    sql`select count(*)::int as base, (count(*) filter (where status = 'returned'))::int as ok
      from ${cases}
      where service = 'lost_found' and kind = 'found' and status <> 'withdrawn'
        and ${within(cases.createdAt, range)} and ${cases.createdAt} <= ${matureBefore}::timestamptz`,
  );

  const take = await queryOne<{ total: number; online: number }>(
    db,
    sql`select count(*)::int as total,
        (count(*) filter (where not exists (
          select 1 from case_events e where e.case_id = ${cases.id} and e.type = 'created' and e.actor_user_id is not null
        )))::int as online
      from ${cases}
      where service = 'lost_found' and ${within(cases.createdAt, range)}`,
  );

  const medianDays = numOrNull(returned.median);
  return {
    lostReceived: countMeasure(receivedOf("lost")),
    foundReceived: countMeasure(receivedOf("found")),
    returned: countMeasure(num(returned.n)),
    returnRate: shareMeasure(num(rate.ok), num(rate.base)),
    medianDaysToReturn: measure(num(returned.n), medianDays === null ? null : round1(medianDays)),
    onlineShare: shareMeasure(num(take.online), num(take.total)),
  };
}
