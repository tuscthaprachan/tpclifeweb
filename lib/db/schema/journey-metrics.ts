import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A count of public journeys started and finished, for the completion rate on
 * /performance (lib/performance). One row per journey, written when a person
 * presses "Start now" and completed when the report or complaint is sent.
 *
 * NOT PERSONAL DATA. The row holds the journey kind and two timestamps and
 * nothing else: no answers, no cookie token, no IP address and no case id, so
 * a row cannot be tied to a person or to a case. `id` is the journey's own
 * random id, used only to find the row again at the end; the journey draft
 * itself (encrypted, short lived, deleted on expiry) is what this table
 * outlives, which is why it exists. Rows are kept for reporting and need no
 * retention job.
 */
export const JOURNEY_METRIC_KINDS = ["lost", "found", "claim", "complaint"] as const;
export type JourneyMetricKind = (typeof JOURNEY_METRIC_KINDS)[number];

export const journeyMetrics = pgTable(
  "journey_metrics",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    check("journey_metrics_kind", sql`${t.kind} in ('lost', 'found', 'claim', 'complaint')`),
    index("journey_metrics_kind_started_idx").on(t.kind, t.startedAt),
  ],
);
