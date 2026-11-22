/**
 * Daily personal data retention job. The Scheduled jobs GitHub workflow (.github/workflows/cron-plesk.yml)
 * calls this daily with `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. With no `CRON_SECRET` set the route is closed to everyone.
 */

import { purgeExpiredPii } from "@/lib/cases/retention";
import { withCronAuth } from "@/lib/admin/health/with-cron-auth";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const GET = withCronAuth("retention", (db, now) => purgeExpiredPii(db, now, getStorage));
