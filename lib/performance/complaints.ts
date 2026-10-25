/**
 * Complaint measures, from SQL aggregates over `cases`, `complaint_cases`,
 * `complaint_categories` and `complaint_surveys`. Never reads an encrypted
 * column. A restricted category is never named: `groupCategoryCounts` folds
 * those into "Sensitive". Keep the definitions in step with the `perf` strings.
 *
 *   received            complaints opened in the period (also by month)
 *   acknowledged on time  of complaints opened in the period that have been
 *                       acknowledged or whose acknowledge date has passed
 *                       (withdrawn ones that were never acknowledged left
 *                       out), the share acknowledged by that date
 *   resolved on time    the same for the resolve date. A reopened complaint
 *                       has a new resolve date from the reopening
 *   median days         from opened to resolved, for complaints resolved in
 *                       the period (calendar days)
 *   satisfaction        survey scores given in the period, 1 to 5: the mean,
 *                       and the share scoring 4 or 5
 *   reopen rate         of complaints opened in the period that have been
 *                       resolved at least once, the share reopened
 *   online share        complaints made on the public journey, out of all
 *                       opened in the period
 */

import { sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories, complaintSurveys } from "@/lib/db/schema/complaints";
import { bangkokMonthKey, monthKeysBetween, type Range } from "./period";
import { countMeasure, groupCategoryCounts, measure, round1, shareMeasure, type GroupedRow, type Measure } from "./suppress";
import { num, numOrNull, queryOne, queryRows, within } from "./sql";

/** Most months a table of months will list; "all time" shows the latest. */
export const MAX_MONTHS = 36;

export interface ComplaintMeasures {
  received: Measure;
  /** Oldest first. Empty for periods shorter than a month. */
  byMonth: Array<{ month: string; received: Measure }>;
  byCategory: GroupedRow[];
  acknowledgedOnTime: Measure;
  resolvedOnTime: Measure;
  medianDaysToResolution: Measure;
  /** Mean score out of 5; `n` is the number of responses. */
  satisfactionMean: Measure;
  /** Share scoring 4 or 5. */
  satisfiedShare: Measure;
  reopenRate: Measure;
  onlineShare: Measure;
}

export async function complaintMeasures(db: AuditExecutor, range: Range, now: Date, monthly: boolean): Promise<ComplaintMeasures> {
  const at = now.toISOString();
  const opened = within(cases.createdAt, range);

  const total = await queryOne<{ n: number }>(
    db,
    sql`select count(*)::int as n from ${cases} where service = 'complaint' and ${opened}`,
  );

  const monthRows = monthly
    ? await queryRows<{ month: string; n: number }>(
        db,
        sql`select to_char(${cases.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM') as month, count(*)::int as n
          from ${cases} where service = 'complaint' and ${opened} group by 1 order by 1`,
      )
    : [];

  const categoryRows = await queryRows<{ key: string; name_th: string; name_en: string; restricted: boolean; n: number }>(
    db,
    sql`select cat.key as key, cat.name_th as name_th, cat.name_en as name_en, cat.restricted as restricted, count(*)::int as n
      from ${complaintCases} cc
      inner join ${cases} on ${cases.id} = cc.case_id
      inner join ${complaintCategories} cat on cat.id = cc.category_id
      where ${opened}
      group by cat.key, cat.name_th, cat.name_en, cat.restricted`,
  );

  const ack = await queryOne<{ base: number; ok: number }>(
    db,
    sql`select count(*)::int as base,
        (count(*) filter (where cc.acknowledged_at is not null and cc.acknowledged_at <= cc.acknowledge_due_at))::int as ok
      from ${complaintCases} cc inner join ${cases} on ${cases.id} = cc.case_id
      where ${opened}
        and (cc.acknowledged_at is not null or (${cases.status} <> 'withdrawn' and cc.acknowledge_due_at < ${at}::timestamptz))`,
  );

  const resolve = await queryOne<{ base: number; ok: number }>(
    db,
    sql`select count(*)::int as base,
        (count(*) filter (where cc.resolved_at is not null and cc.resolved_at <= cc.resolve_due_at))::int as ok
      from ${complaintCases} cc inner join ${cases} on ${cases.id} = cc.case_id
      where ${opened}
        and (cc.resolved_at is not null or (${cases.status} <> 'withdrawn' and cc.resolve_due_at < ${at}::timestamptz))`,
  );

  const median = await queryOne<{ n: number; median: number | null }>(
    db,
    sql`select count(*)::int as n,
        (percentile_cont(0.5) within group (order by extract(epoch from (cc.resolved_at - ${cases.createdAt})) / 86400.0))::float8 as median
      from ${complaintCases} cc inner join ${cases} on ${cases.id} = cc.case_id
      where cc.resolved_at is not null and ${within(sql`cc.resolved_at`, range)}`,
  );

  const survey = await queryOne<{ n: number; mean: number | null; satisfied: number }>(
    db,
    sql`select count(*)::int as n, avg(${complaintSurveys.score})::float8 as mean,
        (count(*) filter (where ${complaintSurveys.score} >= 4))::int as satisfied
      from ${complaintSurveys} where ${within(complaintSurveys.createdAt, range)}`,
  );

  const reopen = await queryOne<{ base: number; ok: number }>(
    db,
    sql`select count(*)::int as base, (count(*) filter (where cc.reopen_count > 0))::int as ok
      from ${complaintCases} cc inner join ${cases} on ${cases.id} = cc.case_id
      where ${opened} and (cc.resolved_at is not null or cc.reopen_count > 0)`,
  );

  const take = await queryOne<{ total: number; online: number }>(
    db,
    sql`select count(*)::int as total,
        (count(*) filter (where not exists (
          select 1 from case_events e where e.case_id = ${cases.id} and e.type = 'created' and e.actor_user_id is not null
        )))::int as online
      from ${cases} where service = 'complaint' and ${opened}`,
  );

  const medianDays = numOrNull(median.median);
  const meanScore = numOrNull(survey.mean);
  return {
    received: countMeasure(num(total.n)),
    byMonth: monthly ? monthTable(monthRows, range, now) : [],
    byCategory: groupCategoryCounts(
      categoryRows.map((r) => ({ key: r.key, nameTh: r.name_th, nameEn: r.name_en, restricted: r.restricted, n: num(r.n) })),
    ),
    acknowledgedOnTime: shareMeasure(num(ack.ok), num(ack.base)),
    resolvedOnTime: shareMeasure(num(resolve.ok), num(resolve.base)),
    medianDaysToResolution: measure(num(median.n), medianDays === null ? null : round1(medianDays)),
    satisfactionMean: measure(num(survey.n), meanScore === null ? null : round1(meanScore)),
    satisfiedShare: shareMeasure(num(survey.satisfied), num(survey.n)),
    reopenRate: shareMeasure(num(reopen.ok), num(reopen.base)),
    onlineShare: shareMeasure(num(take.online), num(take.total)),
  };
}

/** One row per month with no gaps; a month with fewer than five complaints is hidden like any other figure. */
function monthTable(rows: Array<{ month: string; n: number }>, range: Range, now: Date): ComplaintMeasures["byMonth"] {
  const first = range.from ? bangkokMonthKey(range.from) : rows[0]?.month;
  if (!first) return [];
  const keys = monthKeysBetween(first, bangkokMonthKey(now)).slice(-MAX_MONTHS);
  const byKey = new Map(rows.map((r) => [r.month, num(r.n)]));
  return keys.map((month) => ({ month, received: countMeasure(byKey.get(month) ?? 0) }));
}
