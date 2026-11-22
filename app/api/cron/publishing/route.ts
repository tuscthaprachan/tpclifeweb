/**
 * Daily publishing job: records in the audit log which scheduled items went
 * live or came down, and expires the caches that render them. The Scheduled jobs GitHub workflow (.github/workflows/cron-plesk.yml)
 * calls this daily with `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. With no `CRON_SECRET` set the route is closed to everyone.
 */

import { withCronAuth } from "@/lib/admin/health/with-cron-auth";
import { runPublishingSweep } from "@/lib/publishing/sweep";

export const dynamic = "force-dynamic";

export const GET = withCronAuth("publishing", (db, now) => runPublishingSweep(db, now));
