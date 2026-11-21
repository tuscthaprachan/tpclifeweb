"use client";

import Link from "next/link";
import { EmptyState, Stack } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Organisation, OrganisationType } from "@/lib/content/types";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { DirectoryFilterForm, type FacultyOption } from "./DirectoryFilterForm";
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
  const queryText = (query.q ?? "").trim();
  const needle = queryText.toLocaleLowerCase();
  const facultyFilter = typeFilter === "" || typeFilter === "facultyCommittee" ? (query.faculty ?? "") : "";

  const facultyOptions = facultyOptionsFrom(organisations, locale);

  let filtered = organisations;
  if (typeFilter) filtered = filtered.filter((org) => org.type === typeFilter);
  if (facultyFilter) filtered = filtered.filter((org) => org.faculty && (org.faculty.en || org.faculty.th) === facultyFilter);
  if (needle) {
    filtered = filtered.filter((org) =>
      [org.name.th, org.name.en, org.faculty?.th, org.faculty?.en, org.description?.th, org.description?.en].some((text) =>
        text?.toLocaleLowerCase().includes(needle),
      ),
    );
  }

  const grouped = groupOrganisations(filtered, locale);
  const directoryPath = localePath(locale, "/directory");
  const hasActiveFilter = typeFilter !== "" || facultyFilter !== "" || needle !== "";

  const sections = [
    ...grouped.facultyGroups.map((group, index) => ({
      id: `directory-section-faculty-${index}`,
      heading: pick(group.faculty, locale),
      organisations: group.organisations,
    })),
    { id: "directory-section-clubs", heading: DIRECTORY_TEXT.clubsHeading[locale], organisations: grouped.clubs },
    { id: "directory-section-other", heading: DIRECTORY_TEXT.otherHeading[locale], organisations: grouped.other },
  ].filter((section) => section.organisations.length > 0);

  const countText = (filtered.length === 1 ? DIRECTORY_TEXT.resultCountOne : DIRECTORY_TEXT.resultCountMany)[locale].replace(
    "{n}",
    String(filtered.length),
  );

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

      {filtered.length === 0 ? (
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
            {sections.map((section) => (
              <OrganisationGroup
                key={section.id}
                id={section.id}
                heading={section.heading}
                headingLevel={2}
                organisations={section.organisations}
                locale={locale}
              />
            ))}
          </Stack>
        </>
      )}
    </>
  );
}
