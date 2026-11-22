import { bangkokDateKey } from "@/lib/i18n/format";
import { addDaysToDateKey, originDepartures, type ShuttleStatus } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";

export interface MergedNoService {
  nextServiceDate: string | null;
  firstDeparture: string | null;
  isTomorrow: boolean;
}

/**
 * One row for every route when all of them have no service today and resume
 * on the same date at the same first departure. Anything else keeps a row per
 * route.
 */
export function mergeNoServiceToday(routes: ShuttleRoute[], statuses: ShuttleStatus[], now: Date): MergedNoService | null {
  if (routes.length === 0 || routes.length !== statuses.length) return null;
  const first = statuses[0];
  if (!first || first.kind !== "notToday") return null;
  const nextServiceDate = first.nextServiceDate;
  const firstDeparture = originDepartures(routes[0]!)[0]?.time ?? null;
  for (let i = 0; i < statuses.length; i += 1) {
    const status = statuses[i]!;
    if (status.kind !== "notToday" || status.nextServiceDate !== nextServiceDate) return null;
    if ((originDepartures(routes[i]!)[0]?.time ?? null) !== firstDeparture) return null;
  }
  return {
    nextServiceDate,
    firstDeparture,
    isTomorrow: nextServiceDate !== null && nextServiceDate === addDaysToDateKey(bangkokDateKey(now), 1),
  };
}
