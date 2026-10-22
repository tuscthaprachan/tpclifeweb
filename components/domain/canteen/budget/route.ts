/**
 * The walking route for a set of stalls, as the map wants it: stops in route
 * order from the first entrance. Pure.
 */

import { cellCentre, entrancePoint, hasFloorPlan, routeOrder, type MapHighlight } from "../map";
import type { CanteenData, CanteenStall } from "@/lib/sanity/types";

export interface Route {
  /** The stalls in the order to visit them. */
  stops: CanteenStall[];
  highlights: MapHighlight[];
  entranceIndex?: number;
}

/** The route, or null when the canteen has no drawable floor plan. */
export function routeFor(data: CanteenData, stalls: readonly CanteenStall[]): Route | null {
  const settings = data.settings;
  if (!settings || !hasFloorPlan(settings, data.stalls) || stalls.length === 0) return null;
  const entrances = settings.entrances ?? [];
  const first = entrances[0];
  const start = first ? entrancePoint(first) : cellCentre(stalls[0]!.mapCell);
  const stops = routeOrder(stalls, start);
  return {
    stops,
    highlights: stops.map((stall, position) => ({ stallId: stall._id, order: position + 1 })),
    ...(first ? { entranceIndex: 0 } : {}),
  };
}
