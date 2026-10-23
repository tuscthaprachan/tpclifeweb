import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { directoryOrganisations, places, type PlaceRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { ci, iso, ls, lsOpt, ltOpt, opt, withKeys } from "./map";
import { safeFetch } from "./safe-fetch";
import type { CampusPlace, Organisation } from "./types";

export function toCampusPlace(row: PlaceRow): CampusPlace {
  return {
    _id: row.id,
    _type: "place",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    name: ls(row.nameTh, row.nameEn),
    slug: { current: row.slug },
    building: lsOpt(row.buildingTh, row.buildingEn),
    description: ltOpt(row.descriptionTh, row.descriptionEn),
    category: row.category,
    openingHours: row.openingHours.length > 0 ? withKeys(row.openingHours) : undefined,
    closureNote: lsOpt(row.closureNoteTh, row.closureNoteEn),
    lat: opt(row.lat),
    lng: opt(row.lng),
    isKeyLocation: row.isKeyLocation,
  };
}

/** Published places by id. Used wherever a record points at a place. */
export async function readPlacesByIds(db: AuditExecutor, ids: readonly (string | null | undefined)[]): Promise<Map<string, CampusPlace>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const out = new Map<string, CampusPlace>();
  if (wanted.length === 0) return out;
  const rows = await db
    .select()
    .from(places)
    .where(and(eq(places.status, "published"), inArray(places.id, wanted)));
  for (const row of rows) out.set(row.id, toCampusPlace(row));
  return out;
}

/** Active directory entries, A to Z by English name. */
export async function readOrganisations(db: AuditExecutor): Promise<Organisation[]> {
  const rows = await db
    .select()
    .from(directoryOrganisations)
    .where(and(eq(directoryOrganisations.status, "published"), eq(directoryOrganisations.isActive, true)))
    .orderBy(ci(directoryOrganisations.nameEn), asc(directoryOrganisations.slug));
  return rows.map((row) => ({
    _id: row.id,
    _type: "organisation",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    name: ls(row.nameTh, row.nameEn),
    slug: { current: row.slug },
    type: row.type,
    faculty: lsOpt(row.facultyTh, row.facultyEn),
    description: ltOpt(row.descriptionTh, row.descriptionEn),
    contacts: withKeys(row.contacts),
    location: lsOpt(row.locationTh, row.locationEn),
    isActive: row.isActive,
  }));
}

/** Every place, or only the key ones (shown on the at-a-glance panel), A to Z by English name. */
export async function readPlaces(db: AuditExecutor, keyOnly = false): Promise<CampusPlace[]> {
  const rows = await db
    .select()
    .from(places)
    .where(and(eq(places.status, "published"), keyOnly ? eq(places.isKeyLocation, true) : undefined))
    .orderBy(ci(places.nameEn), asc(places.slug));
  return rows.map(toCampusPlace);
}

const cachedOrganisations = cachedRead(["organisations"], [CACHE_TAGS.directory], REVALIDATE.content, () =>
  readOrganisations(getDb()),
);
const cachedKeyPlaces = cachedRead(["places-key"], [CACHE_TAGS.place], REVALIDATE.content, () => readPlaces(getDb(), true));
const cachedPlaces = cachedRead(["places"], [CACHE_TAGS.place], REVALIDATE.content, () => readPlaces(getDb()));

export async function getOrganisations(): Promise<Organisation[]> {
  return safeFetch<Organisation[]>("getOrganisations", () => cachedOrganisations(), []);
}

export async function getKeyPlaces(): Promise<CampusPlace[]> {
  return safeFetch<CampusPlace[]>("getKeyPlaces", () => cachedKeyPlaces(), []);
}

export async function getPlaces(): Promise<CampusPlace[]> {
  return safeFetch<CampusPlace[]>("getPlaces", () => cachedPlaces(), []);
}

