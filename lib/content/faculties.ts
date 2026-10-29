import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { directoryOrganisations, faculties, type FacultyRow } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { ci, ls, lsOpt, opt, withKeys } from "./map";
import { safeFetch } from "./safe-fetch";
import type { LocaleString, OrganisationContact } from "./types";

/**
 * Faculties and colleges with the student bodies that speak for them, for the
 * issue reporting service (a faculty or course matter is signposted, never
 * made into a case). The contract types in `types.ts` are fixed, so the shapes
 * are declared here.
 */

/** What an editor has filled in about the faculty office. Every field is optional; nothing is invented. */
export interface FacultyOffice {
  location?: LocaleString;
  phone?: string;
  email?: string;
  website?: string;
  /** Opening hours or any other note, free text. */
  note?: LocaleString;
}

/** A faculty committee as the service shows it. */
export interface FacultyBody {
  _id: string;
  slug: string;
  name: LocaleString;
  /** `faculty` is the faculty-wide council or committee; `programme` the association of one programme. */
  scope: "faculty" | "programme";
  /** The programme a `programme` body speaks for. */
  programme?: LocaleString;
  contacts: OrganisationContact[];
}

export interface Faculty {
  _id: string;
  slug: string;
  name: LocaleString;
  office: FacultyOffice;
  /** True when at least one office field is filled in. */
  hasOffice: boolean;
  /** Faculty-wide councils or committees, A to Z by English name. A body with no scope set counts as one. */
  councils: FacultyBody[];
  /** Programme associations, A to Z by English name. */
  programmes: FacultyBody[];
}

export function toFacultyOffice(row: FacultyRow): FacultyOffice {
  return {
    location: lsOpt(row.officeLocationTh, row.officeLocationEn),
    phone: opt(row.officePhone),
    email: opt(row.officeEmail),
    website: opt(row.officeWebsite),
    note: lsOpt(row.officeNoteTh, row.officeNoteEn),
  };
}

export const facultyHasOffice = (office: FacultyOffice): boolean => Object.values(office).some((value) => value !== undefined);

async function readBodies(db: AuditExecutor, facultyIds: string[]): Promise<Map<string, FacultyBody[]>> {
  const out = new Map<string, FacultyBody[]>();
  if (facultyIds.length === 0) return out;
  const rows = await db
    .select()
    .from(directoryOrganisations)
    .where(and(eq(directoryOrganisations.status, "published"), eq(directoryOrganisations.isActive, true), inArray(directoryOrganisations.facultyId, facultyIds)))
    .orderBy(ci(directoryOrganisations.nameEn), asc(directoryOrganisations.slug));
  for (const row of rows) {
    const body: FacultyBody = {
      _id: row.id,
      slug: row.slug,
      name: ls(row.nameTh, row.nameEn),
      scope: row.scope ?? "faculty",
      programme: lsOpt(row.programmeNameTh, row.programmeNameEn),
      contacts: withKeys(row.contacts),
    };
    out.set(row.facultyId!, [...(out.get(row.facultyId!) ?? []), body]);
  }
  return out;
}

function toFaculty(row: FacultyRow, bodies: FacultyBody[]): Faculty {
  const office = toFacultyOffice(row);
  return {
    _id: row.id,
    slug: row.slug,
    name: ls(row.nameTh, row.nameEn),
    office,
    hasOffice: facultyHasOffice(office),
    councils: bodies.filter((b) => b.scope === "faculty"),
    programmes: bodies.filter((b) => b.scope === "programme"),
  };
}

/** Published faculties in their set order, each with its office details and its published, active student bodies. */
export async function readFacultiesWithOrganisations(db: AuditExecutor): Promise<Faculty[]> {
  const rows = await db.select().from(faculties).where(eq(faculties.status, "published")).orderBy(asc(faculties.sortOrder), ci(faculties.nameEn), asc(faculties.slug));
  const bodies = await readBodies(db, rows.map((r) => r.id));
  return rows.map((row) => toFaculty(row, bodies.get(row.id) ?? []));
}

/** One published faculty by id, or undefined. For pages and emails that follow a stored reference. */
export async function readFacultyById(db: AuditExecutor, id: string): Promise<Faculty | undefined> {
  const [row] = await db.select().from(faculties).where(and(eq(faculties.status, "published"), eq(faculties.id, id)));
  if (!row) return undefined;
  return toFaculty(row, (await readBodies(db, [row.id])).get(row.id) ?? []);
}

const cachedFaculties = cachedRead(["faculties"], [CACHE_TAGS.faculty], REVALIDATE.content, () => readFacultiesWithOrganisations(getDb()));

export async function getFacultiesWithOrganisations(): Promise<Faculty[]> {
  return safeFetch<Faculty[]>("getFacultiesWithOrganisations", () => cachedFaculties(), []);
}
