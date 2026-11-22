/**
 * The scheduled jobs and when they run (UTC). The Scheduled jobs GitHub
 * workflow (.github/workflows/cron-plesk.yml) holds the same four schedules;
 * tests/unit/admin-ops/health.test.ts fails if the two drift apart.
 */

export const CRON_SCHEDULES = [
  { path: "/api/cron/retention", schedule: "0 19 * * *" },
  { path: "/api/cron/complaints", schedule: "23 0 * * *" },
  { path: "/api/cron/borrowing", schedule: "41 1 * * *" },
  { path: "/api/cron/publishing", schedule: "17 17 * * *" },
] as const;
