import { count, eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { canteenSettings, events, lostFoundItems } from "@/lib/db/schema";

export interface PlaceUsage {
  events: number;
  lostFound: number;
  canteen: number;
  total: number;
}

/**
 * What still points at a place. The foreign keys only clear the link when a
 * place is deleted, which would quietly blank those records' location, so the
 * delete action refuses while any of these is above zero.
 */
export async function placeUsage(db: AuditExecutor, placeId: string): Promise<PlaceUsage> {
  const [[e], [l], [c]] = await Promise.all([
    db.select({ n: count() }).from(events).where(eq(events.placeId, placeId)),
    db.select({ n: count() }).from(lostFoundItems).where(eq(lostFoundItems.placeId, placeId)),
    db.select({ n: count() }).from(canteenSettings).where(eq(canteenSettings.canteenPlaceId, placeId)),
  ]);
  const usage = { events: e?.n ?? 0, lostFound: l?.n ?? 0, canteen: c?.n ?? 0 };
  return { ...usage, total: usage.events + usage.lostFound + usage.canteen };
}
