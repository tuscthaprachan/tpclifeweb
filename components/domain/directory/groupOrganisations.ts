import { pick, type Locale } from "@/lib/i18n/config";
import type { LocaleString, Organisation } from "@/lib/content/types";

export interface FacultyGroup {
  /** `faculty.en`, used as a stable sort/dedupe key across both locales. */
  facultyKey: string;
  faculty: LocaleString;
  organisations: Organisation[];
}

export interface GroupedOrganisations {
  /** Faculty committees, grouped by faculty then sorted by faculty name; the faculty-wide council leads each group. */
  facultyGroups: FacultyGroup[];
  /** Clubs and independent groups, combined: neither carries a faculty. */
  clubs: Organisation[];
  /** Student bodies and university divisions, everything left over. */
  other: Organisation[];
}

function byName(collator: Intl.Collator, locale: Locale) {
  return (a: Organisation, b: Organisation): number => collator.compare(pick(a.name, locale), pick(b.name, locale));
}

/**
 * Groups organisations the way CONTRIBUTING.md asks for the directory to
 * read: by faculty first, then clubs and independent groups as their own
 * section. This is a list grouped for scanning, not a bento grid.
 */
export function groupOrganisations(organisations: Organisation[], locale: Locale): GroupedOrganisations {
  const collator = new Intl.Collator(locale);
  const compareByName = byName(collator, locale);
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

  const facultyGroups = [...facultyMap.values()].sort((a, b) =>
    collator.compare(pick(a.faculty, locale), pick(b.faculty, locale)),
  );
  for (const group of facultyGroups) {
    group.organisations.sort(
      (a, b) => Number(b.scope === "faculty") - Number(a.scope === "faculty") || compareByName(a, b),
    );
  }
  clubs.sort(compareByName);
  other.sort(compareByName);

  return { facultyGroups, clubs, other };
}
