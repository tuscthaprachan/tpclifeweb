/**
 * Daily equipment loans job (see vercel.json): return reminders, one overdue
 * notice per loan, and the sweep of abandoned request journeys. Vercel Cron
 * calls this with `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. With no `CRON_SECRET` set the route is closed to everyone.
 */

import { runBorrowingDaily } from "@/lib/borrowing/cron";
import { withCronAuth } from "@/lib/admin/health/with-cron-auth";

export const dynamic = "force-dynamic";

export const GET = withCronAuth("borrowing", (db, now) => runBorrowingDaily(db, now));
