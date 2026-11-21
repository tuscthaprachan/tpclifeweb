"use client";

import Link from "next/link";
import { EmptyState, Stack } from "@/components/ui";
import type { Faculty } from "@/lib/content/faculties";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Organisation, OrganisationType } from "@/lib/content/types";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import type { Audience } from "./AudienceTag";
import { DirectoryFilterForm, type FacultyOption } from "./DirectoryFilterForm";
import { FacultySection } from "./FacultySection";
import { groupOrganisations } from "./groupOrganisations";
import { OrganisationGroup } from "./OrganisationGroup";
import { DIRECTORY_TEXT } from "./strings";

const VALID_TYPES = new Set<OrganisationType>([
  "facultyCommittee",
  "club",
  "independentGroup",
  "universityDivision",
  "studentBody",
]);

const facultyKeyOf = (faculty: { en: string; th: string }) => faculty.en || faculty.th;

function facultyOptionsFrom(organisations: Organisation[], faculties: Faculty[], locale: Locale): FacultyOption[] {
  const seen = new Map<string, string>();
  for (const faculty of faculties) seen.set(facultyKeyOf(faculty.name), pick(faculty.name, locale));
  for (const org of organisations) {
    if (org.type !== "facultyCommittee" || !org.faculty) continue;
    const key = facultyKeyOf(org.faculty);
    if (!seen.has(key)) seen.set(key, pick(org.faculty, locale));
  }
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], locale)).map(([value, label]) => ({ value, label }));
}

interface DirectoryResultsProps {
  locale: Locale;
  organisations: Organisation[];
  faculties: Faculty[];
}

type Section =
  | { kind: "faculty"; id: string; heading: string; faculty: Faculty | undefined; showOffice: boolean; committees: Organisation[]; showNoCommittees: boolean }
  | { kind: "group"; id: string; heading: string; audience: Audience; organisations: Organisation[] };

export function LiveDirectoryResults(props: DirectoryResultsProps) {
  return <DirectoryResults {...props} query={useQueryRecord()} />;
}

export function DirectoryResults({ locale, organisations, faculties, query }: DirectoryResultsProps & { query: QueryRecord }) {
  const rawType = query.type ?? "";
  const typeFilter = VALID_TYPES.has(rawType as OrganisationType) ? (rawType as OrganisationType) : "";
  const queryText = (query.q ?? "").trim();
  const needle = queryText.toLocaleLowerCase();
  const facultyFilter = typeFilter === "" || typeFilter === "facultyCommittee" ? (query.faculty ?? "") : "";
  const matches = (texts: Array<string | undefined>) => !needle || texts.some((text) => text?.toLocaleLowerCase().includes(needle));

  const facultyOptions = facultyOptionsFrom(organisations, faculties, locale);

  let filtered = organisations;
  if (typeFilter) filtered = filtered.filter((org) => org.type === typeFilter);
  if (facultyFilter) filtered = filtered.filter((org) => org.faculty && facultyKeyOf(org.faculty) === facultyFilter);
  if (needle) {
    filtered = filtered.filter((org) =>
      matches([org.name.th, org.name.en, org.faculty?.th, org.faculty?.en, org.description?.th, org.description?.en]),
    );
  }

  const offices = typeFilter === "" ? faculties.filter((f) => (!facultyFilter || facultyKeyOf(f.name) === facultyFilter) && matches([f.name.th, f.name.en, ...f.programmeOffices.flatMap((p) => [p.name.th, p.name.en])])) : [];
  const officeShown = new Set(offices.map((f) => f._id));
  const facultyById = new Map(faculties.map((f) => [f._id, f]));
  const facultyByKey = new Map(faculties.map((f) => [facultyKeyOf(f.name), f]));
  const showNoCommittees = typeFilter === "" && !needle;

  const grouped = groupOrganisations(filtered, locale);
  const facultyEntries = grouped.facultyGroups.map((group) => ({
    key: group.facultyKey,
    name: group.faculty,
    faculty: (group.facultyId ? facultyById.get(group.facultyId) : undefined) ?? facultyByKey.get(group.facultyKey),
    committees: group.organisations,
  }));
  const covered = new Set(facultyEntries.map((entry) => entry.faculty?._id).filter(Boolean));
  for (const faculty of offices) {
    if (!covered.has(faculty._id)) facultyEntries.push({ key: facultyKeyOf(faculty.name), name: faculty.name, faculty, committees: [] });
  }
  const collator = new Intl.Collator(locale);
  facultyEntries.sort((a, b) => collator.compare(pick(a.name, locale), pick(b.name, locale)));

  const directoryPath = localePath(locale, "/directory");
  const hasActiveFilter = typeFilter !== "" || facultyFilter !== "" || needle !== "";

  const allSections: Section[] = [
    ...facultyEntries.map(
      (entry, index): Section => ({
        kind: "faculty",
        id: `directory-section-faculty-${index}`,
        heading: pick(entry.name, locale),
        faculty: entry.faculty,
        showOffice: entry.faculty !== undefined && officeShown.has(entry.faculty._id),
        committees: entry.committees,
        showNoCommittees,
      }),
    ),
    { kind: "group" as const, id: "directory-section-clubs", heading: DIRECTORY_TEXT.clubsHeading[locale], audience: "students" as const, organisations: grouped.clubs },
    { kind: "group" as const, id: "directory-section-student-bodies", heading: DIRECTORY_TEXT.studentBodiesHeading[locale], audience: "students" as const, organisations: grouped.studentBodies },
    { kind: "group" as const, id: "directory-section-divisions", heading: DIRECTORY_TEXT.divisionsHeading[locale], audience: "staff" as const, organisations: grouped.divisions },
  ];
  const sections = allSections.filter((section) => (section.kind === "faculty" ? section.showOffice || section.committees.length > 0 : section.organisations.length > 0));

  const total = filtered.length + offices.length;
  const countText = (total === 1 ? DIRECTORY_TEXT.resultCountOne : DIRECTORY_TEXT.resultCountMany)[locale].replace("{n}", String(total));

  return (
    <>
      <DirectoryFilterForm
        key={`${typeFilter}|${facultyFilter}|${queryText}`}
        locale={locale}
        action={directoryPath}
        currentType={typeFilter}
        currentFaculty={facultyFilter}
        currentQuery={queryText}
        facultyOptions={facultyOptions}
      />

      <p className="m-0 text-base text-ink-600" aria-live="polite">
        {countText}
      </p>

      {sections.length === 0 ? (
        <EmptyState
          title={UI.nothingHere[locale]}
          action={
            hasActiveFilter ? (
              <Link href={directoryPath} className="text-base text-action underline">
                {UI.clearFilters[locale]}
              </Link>
            ) : undefined
          }
        >
          {hasActiveFilter ? DIRECTORY_TEXT.noMatchHint[locale] : undefined}
        </EmptyState>
      ) : (
        <>
          {sections.length > 1 ? (
            <nav aria-label={DIRECTORY_TEXT.jumpToLabel[locale]}>
              <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] p-0">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-base text-action underline">
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <Stack space={8}>
            {sections.map((section) =>
              section.kind === "faculty" ? (
                <FacultySection
                  key={section.id}
                  id={section.id}
                  heading={section.heading}
                  locale={locale}
                  office={section.faculty?.office}
                  programmeOffices={section.faculty?.programmeOffices ?? []}
                  showOffice={section.showOffice}
                  committees={section.committees}
                  showNoCommittees={section.showNoCommittees}
                />
              ) : (
                <OrganisationGroup
                  key={section.id}
                  id={section.id}
                  heading={section.heading}
                  headingLevel={2}
                  organisations={section.organisations}
                  locale={locale}
                  audience={section.audience}
                />
              ),
            )}
          </Stack>
        </>
      )}
    </>
  );
}
