/**
 * Where a redirected complaint was sent, read back for the person (the status
 * page and the email). What staff chose is stored as references on
 * `complaint_cases` (lib/db/schema/complaints.ts); the names, Instagram
 * handles and office details are read live from the faculties and directory
 * rows, so a correction made there reaches everyone who is still looking.
 */

import { eq } from "drizzle-orm";
import { readFacultyById, type Faculty, type FacultyBody } from "@/lib/content/faculties";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintCases, type ComplaintRedirectLevel } from "@/lib/db/schema/complaints";

export interface RedirectTarget {
  level: ComplaintRedirectLevel;
  /** Null when the faculty has since been unpublished or removed. */
  faculty: Faculty | null;
  /** Faculty level only: the student bodies to contact. Empty for a course, and when the faculty lists none. */
  bodies: FacultyBody[];
}

/**
 * The bodies to point to. The programme association staff chose, if there is
 * one; else the faculty-wide council or committee; else any programme
 * associations the faculty has.
 */
export function bodiesFor(faculty: Faculty, chosenOrganisationId: string | null): FacultyBody[] {
  const all = [...faculty.councils, ...faculty.programmes];
  const chosen = chosenOrganisationId ? all.find((b) => b._id === chosenOrganisationId) : undefined;
  if (chosen) return [chosen];
  return faculty.councils.length > 0 ? faculty.councils : faculty.programmes;
}

/** The redirect target of a complaint, or null if it was not redirected. */
export async function loadRedirectTarget(db: AuditExecutor, caseId: string): Promise<RedirectTarget | null> {
  const [row] = await db
    .select({ level: complaintCases.redirectLevel, facultyId: complaintCases.redirectFacultyId, organisationId: complaintCases.redirectOrganisationId })
    .from(complaintCases)
    .where(eq(complaintCases.caseId, caseId));
  if (!row?.level) return null;
  const level = row.level as ComplaintRedirectLevel;
  const faculty = row.facultyId ? ((await readFacultyById(db, row.facultyId)) ?? null) : null;
  return { level, faculty, bodies: level === "faculty" && faculty ? bodiesFor(faculty, row.organisationId) : [] };
}
