"use client";

import { EmptyState, Stack } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LocaleString, Organisation, OrganisationType } from "@/lib/content/types";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { DirectoryFilterForm, type FacultyOption } from "./DirectoryFilterForm";
import { groupOrganisations } from "./groupOrganisations";
import { OrganisationGroup } from "./OrganisationGroup";

const VALID_TYPES = new Set<OrganisationType>([
  "facultyCommittee",
  "club",
  "independentGroup",
  "universityDivision",
  "studentBody",
]);

// No entry in lib/i18n/strings.ts for either group heading, only the
// unrelated Category union. Hardcoded and reported, per CONTRIBUTING.md.
const CLUBS_HEADING: LocaleString = { th: "ชุมนุมและกลุ่มอิสระ", en: "Clubs and independent groups" }; // TODO: add to UI strings
const OTHER_HEADING: LocaleString = { th: "องค์กรนักศึกษาและหน่วยงานมหาวิทยาลัย", en: "Student bodies and university divisions" }; // TODO: add to UI strings

function facultyOptionsFrom(organisations: Organisation[], locale: Locale): FacultyOption[] {
  const seen = new Map<string, string>();
  for (const org of organisations) {
    if (org.type !== "facultyCommittee" || !org.faculty) continue;
    const key = org.faculty.en || org.faculty.th;
    if (!seen.has(key)) seen.set(key, pick(org.faculty, locale));
  }
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
}

interface DirectoryResultsProps {
  locale: Locale;
  organisations: Organisation[];
}

export function LiveDirectoryResults(props: DirectoryResultsProps) {
  return <DirectoryResults {...props} query={useQueryRecord()} />;
}

export function DirectoryResults({ locale, organisations, query }: DirectoryResultsProps & { query: QueryRecord }) {
  const rawType = query.type ?? "";
  const typeFilter = VALID_TYPES.has(rawType as OrganisationType) ? (rawType as OrganisationType) : "";
  const facultyFilter = query.faculty ?? "";

  const facultyOptions = facultyOptionsFrom(organisations, locale);

  let filtered = organisations;
  if (typeFilter) filtered = filtered.filter((org) => org.type === typeFilter);
  if (facultyFilter) filtered = filtered.filter((org) => org.faculty && (org.faculty.en || org.faculty.th) === facultyFilter);

  const grouped = groupOrganisations(filtered);

  return (
    <>
      <DirectoryFilterForm
        key={`${typeFilter}|${facultyFilter}`}
        locale={locale}
        action={localePath(locale, "/directory")}
        currentType={typeFilter}
        currentFaculty={facultyFilter}
        facultyOptions={facultyOptions}
      />

      {filtered.length === 0 ? (
        <EmptyState title={UI.nothingHere[locale]} />
      ) : (
        <Stack space={8}>
          {grouped.facultyGroups.map((group) => (
            <OrganisationGroup
              key={group.facultyKey}
              heading={pick(group.faculty, locale)}
              headingLevel={2}
              organisations={group.organisations}
              locale={locale}
            />
          ))}
          <OrganisationGroup heading={CLUBS_HEADING[locale]} headingLevel={2} organisations={grouped.clubs} locale={locale} />
          <OrganisationGroup heading={OTHER_HEADING[locale]} headingLevel={2} organisations={grouped.other} locale={locale} />
        </Stack>
      )}
    </>
  );
}
