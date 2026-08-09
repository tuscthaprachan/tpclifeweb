import type { LocaleString, Organisation } from "@/lib/sanity/types";

export interface FacultyGroup {
  /** `faculty.en`, used as a stable sort/dedupe key across both locales. */
  facultyKey: string;
  faculty: LocaleString;
  organisations: Organisation[];
}

export interface GroupedOrganisations {
  /** Faculty committees, grouped by faculty then sorted by faculty name. */
  facultyGroups: FacultyGroup[];
  /** Clubs and independent groups, combined: neither carries a faculty. */
  clubs: Organisation[];
  /** Student bodies and university divisions, everything left over. */
  other: Organisation[];
}

function byNameEn(a: Organisation, b: Organisation): number {
  return a.name.en.localeCompare(b.name.en);
}

/**
 * Groups organisations the way CONTRIBUTING.md asks for the directory to
 * read: by faculty first, then clubs and independent groups as their own
 * section. This is a list grouped for scanning, not a bento grid.
 */
export function groupOrganisations(organisations: Organisation[]): GroupedOrganisations {
  const facultyMap = new Map<string, FacultyGroup>();
  const clubs: Organisation[] = [];
  const other: Organisation[] = [];

  for (const org of organisations) {
    if (org.type === "facultyCommittee" && org.faculty) {
      const key = org.faculty.en || org.faculty.th;
      const existing = facultyMap.get(key);
      if (existing) existing.organisations.push(org);
      else facultyMap.set(key, { facultyKey: key, faculty: org.faculty, organisations: [org] });
    } else if (org.type === "club" || org.type === "independentGroup") {
      clubs.push(org);
    } else {
      other.push(org);
    }
  }

  const facultyGroups = [...facultyMap.values()].sort((a, b) => a.facultyKey.localeCompare(b.facultyKey));
  for (const group of facultyGroups) group.organisations.sort(byNameEn);
  clubs.sort(byNameEn);
  other.sort(byNameEn);

  return { facultyGroups, clubs, other };
}
