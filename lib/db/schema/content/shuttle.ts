import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contentColumns } from "./common";

/**
 * Shuttle routes. The calendar is flattened onto the route (one calendar per
 * route, never queried on its own). Departures are a text[] of "HH:mm"
 * ascending, rendered whole. Stops are a child table: ordered, individually
 * editable, and carrying coordinates.
 */
export const shuttleRoutes = pgTable(
  "shuttle_routes",
  {
    ...contentColumns(),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    descriptionTh: text("description_th"),
    descriptionEn: text("description_en"),
    /** 0 = Sunday through 6 = Saturday, matching Date#getDay. */
    daysOfWeek: smallint("days_of_week").array().notNull().default(sql`'{}'`),
    excludedDates: date("excluded_dates", { mode: "string" }).array().notNull().default(sql`'{}'`),
    addedDates: date("added_dates", { mode: "string" }).array().notNull().default(sql`'{}'`),
    validFrom: date("valid_from", { mode: "string" }),
    validUntil: date("valid_until", { mode: "string" }),
    /** "HH:mm" in Asia/Bangkok, ascending. */
    departures: text("departures").array().notNull().default(sql`'{}'`),
    fareTh: text("fare_th"),
    fareEn: text("fare_en"),
    notesTh: text("notes_th"),
    notesEn: text("notes_en"),
    /** Set only if a genuine realtime feed ever exists. */
    realtimeFeedUrl: text("realtime_feed_url"),
    isActive: boolean("is_active").notNull().default(false),
    sourceNoteTh: text("source_note_th"),
    sourceNoteEn: text("source_note_en"),
    lastVerified: date("last_verified", { mode: "string" }),
  },
  (t) => [index("shuttle_routes_active_idx").on(t.status, t.isActive, t.nameEn)],
);

export const shuttleStops = pgTable(
  "shuttle_stops",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    routeId: uuid("route_id")
      .notNull()
      .references(() => shuttleRoutes.id, { onDelete: "cascade" }),
    /** 0-based order along the route. The first entry is the origin. */
    position: integer("position").notNull(),
    nameTh: text("name_th").notNull().default(""),
    nameEn: text("name_en").notNull().default(""),
    /** Minutes after the route's departure time that this stop is reached. */
    offsetMinutes: integer("offset_minutes").notNull().default(0),
    noteTh: text("note_th"),
    noteEn: text("note_en"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
  },
  (t) => [unique("shuttle_stops_route_position").on(t.routeId, t.position)],
);

export type ShuttleRouteRow = typeof shuttleRoutes.$inferSelect;
export type ShuttleStopRow = typeof shuttleStops.$inferSelect;
