/**
 * Daily complaints job (see vercel.json): closes resolved complaints whose
 * reopen window has passed, flags complaints that missed a target as
 * escalated and emails the leads, and sweeps abandoned journeys. Vercel Cron
 * calls this with `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. With no `CRON_SECRET` set the route is closed to everyone.
 */

import { runComplaintsDaily } from "@/lib/complaints/cron";
import { withCronAuth } from "@/lib/admin/health/with-cron-auth";
import { SITE_URL } from "@/lib/site-url";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const GET = withCronAuth("complaints", (db, now) => runComplaintsDaily(db, now, { origin: SITE_URL, getStorage }));
