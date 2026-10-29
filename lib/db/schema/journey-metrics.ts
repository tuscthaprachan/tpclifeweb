import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * A count of public journeys started and finished, for the completion rate on
 * /performance (lib/performance). One row per journey, written when a person
 * presses "Start now" and completed when the report or complaint is sent.
 *
 * The issue reporting service also writes one row per signpost: when a student
 * is pointed to their faculty, to the lecturer of a course or to emergency
 * help instead of making a complaint. Its kind is `signpost_<level>` and both
 * timestamps are the same instant, so it never counts towards a completion
 * rate (the journey kinds are listed apart, in JOURNEY_METRIC_KINDS).
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

/** Where an issue was signposted to, instead of becoming a complaint case. */
export const SIGNPOST_LEVELS = ["faculty", "course", "emergency"] as const;
export type SignpostLevel = (typeof SIGNPOST_LEVELS)[number];
export const SIGNPOST_METRIC_KINDS = SIGNPOST_LEVELS.map((level) => `signpost_${level}` as const);

export const journeyMetrics = pgTable(
  "journey_metrics",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "journey_metrics_kind",
      sql`${t.kind} in ('lost', 'found', 'claim', 'complaint', 'signpost_faculty', 'signpost_course', 'signpost_emergency')`,
    ),
    index("journey_metrics_kind_started_idx").on(t.kind, t.startedAt),
  ],
);
