import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { events, type EventRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { readPlacesByIds } from "./directory";
import { readFormsByIds } from "./forms";
import { loadImages } from "./images";
import { iso, isoOrUndefined, ls, lsOpt, opt, richPairOpt } from "./map";
import { safeFetch } from "./safe-fetch";
import type { CampusEvent } from "./types";

async function toEvents(db: AuditExecutor, rows: EventRow[]): Promise<CampusEvent[]> {
  if (rows.length === 0) return [];
  const [placeById, formById, imageById] = await Promise.all([
    readPlacesByIds(db, rows.map((r) => r.placeId)),
    readFormsByIds(db, rows.flatMap((r) => (r.relatedFormId ? [r.relatedFormId] : []))),
    loadImages(db, rows.map((r) => r.coverImageId)),
  ]);
  return rows.map((row) => ({
    _id: row.id,
    _type: "event",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    title: ls(row.titleTh, row.titleEn),
    slug: { current: row.slug },
    summary: ls(row.summaryTh, row.summaryEn),
    body: richPairOpt(row.bodyTh, row.bodyEn),
    startsAt: iso(row.startsAt),
    endsAt: isoOrUndefined(row.endsAt),
    isAllDay: row.isAllDay,
    location: lsOpt(row.locationTh, row.locationEn),
    place: row.placeId ? placeById.get(row.placeId) : undefined,
    owner: row.owner,
    category: opt(row.category),
    cover: row.coverImageId ? imageById.get(row.coverImageId) : undefined,
    relatedForm: row.relatedFormId ? formById.get(row.relatedFormId) : undefined,
    registrationUrl: opt(row.registrationUrl),
    isCancelled: row.isCancelled,
    cancellationNote: lsOpt(row.cancellationNoteTh, row.cancellationNoteEn),
  }));
}

/** Events that have not ended yet (or, with no end time, have not started), soonest first. */
export async function readUpcomingEvents(db: AuditExecutor, now: string): Promise<CampusEvent[]> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), sql`coalesce(${events.endsAt}, ${events.startsAt}) >= ${now}::timestamptz`))
    .orderBy(asc(events.startsAt), events.id);
  return toEvents(db, rows);
}

export async function readEventBySlug(db: AuditExecutor, slug: string): Promise<CampusEvent | null> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), eq(events.slug, slug)))
    .limit(1);
  return row ? ((await toEvents(db, [row]))[0] ?? null) : null;
}

const TAGS = [CACHE_TAGS.event, CACHE_TAGS.place, CACHE_TAGS.form, CACHE_TAGS.image] as const;

/** Evaluated when the entry is filled; the window keeps "upcoming" honest as events end. */
const cachedUpcomingEvents = cachedRead(["events-upcoming"], TAGS, REVALIDATE.events, () =>
  readUpcomingEvents(getDb(), new Date().toISOString()),
);
const cachedEventBySlug = cachedRead(["event-by-slug"], TAGS, REVALIDATE.events, (slug: string) =>
  readEventBySlug(getDb(), slug),
);

/** Passing `now` reads straight from the database, uncached. */
export async function getUpcomingEvents(now?: string): Promise<CampusEvent[]> {
  return safeFetch<CampusEvent[]>(
    "getUpcomingEvents",
    () => (now ? readUpcomingEvents(getDb(), now) : cachedUpcomingEvents()),
    [],
  );
}

export async function getEventBySlug(slug: string): Promise<CampusEvent | null> {
  return safeFetch<CampusEvent | null>("getEventBySlug", () => cachedEventBySlug(slug), null);
}
