import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { shuttleRoutes, shuttleStops } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { ci, groupBy, iso, ls, lsOpt, ltOpt, opt, optList } from "./map";
import { safeFetch } from "./safe-fetch";
import type { ShuttleRoute } from "./types";

/**
 * Active routes, A to Z by English name, each with its stops in route order.
 * Times shown from these are computed from the timetable and labelled as
 * scheduled, never live (see lib/shuttle).
 */
export async function readActiveShuttleRoutes(db: AuditExecutor): Promise<ShuttleRoute[]> {
  const routes = await db
    .select()
    .from(shuttleRoutes)
    .where(and(eq(shuttleRoutes.status, "published"), eq(shuttleRoutes.isActive, true)))
    .orderBy(ci(shuttleRoutes.nameEn), shuttleRoutes.slug);
  if (routes.length === 0) return [];

  const stops = await db
    .select()
    .from(shuttleStops)
    .where(
      inArray(
        shuttleStops.routeId,
        routes.map((r) => r.id),
      ),
    )
    .orderBy(asc(shuttleStops.position));
  const stopsByRoute = groupBy(stops, (s) => s.routeId);

  return routes.map((row) => ({
    _id: row.id,
    _type: "shuttleRoute",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    name: ls(row.nameTh, row.nameEn),
    slug: { current: row.slug },
    description: ltOpt(row.descriptionTh, row.descriptionEn),
    stops: (stopsByRoute.get(row.id) ?? []).map((stop) => ({
      _key: stop.id,
      name: ls(stop.nameTh, stop.nameEn),
      offsetMinutes: stop.offsetMinutes,
      note: lsOpt(stop.noteTh, stop.noteEn),
      lat: opt(stop.lat),
      lng: opt(stop.lng),
    })),
    calendar: {
      daysOfWeek: row.daysOfWeek,
      excludedDates: optList(row.excludedDates),
      addedDates: optList(row.addedDates),
      validFrom: opt(row.validFrom),
      validUntil: opt(row.validUntil),
    },
    departures: row.departures,
    fare: lsOpt(row.fareTh, row.fareEn),
    notes: ltOpt(row.notesTh, row.notesEn),
    realtimeFeedUrl: opt(row.realtimeFeedUrl),
    isActive: row.isActive,
    sourceNote: lsOpt(row.sourceNoteTh, row.sourceNoteEn),
    lastVerified: opt(row.lastVerified),
  }));
}

/** A short window: the shuttle panel is one of the surfaces that most needs to feel current. */
const cachedActiveRoutes = cachedRead(["shuttle-routes"], [CACHE_TAGS.shuttle], REVALIDATE.live, () =>
  readActiveShuttleRoutes(getDb()),
);

export async function getActiveShuttleRoutes(): Promise<ShuttleRoute[]> {
  return safeFetch<ShuttleRoute[]>("getActiveShuttleRoutes", () => cachedActiveRoutes(), []);
}
