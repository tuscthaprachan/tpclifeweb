"use client";

import Form from "next/form";
import Link from "next/link";
import { Button, Select } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { DIRECTORY_TEXT } from "./strings";
import type { LocaleString, OrganisationType } from "@/lib/content/types";

const TYPE_OPTION_LABEL: Record<OrganisationType, LocaleString> = {
  facultyCommittee: DIRECTORY_TEXT.typeFacultyCommittee,
  club: DIRECTORY_TEXT.typeClub,
  independentGroup: DIRECTORY_TEXT.typeIndependentGroup,
  universityDivision: DIRECTORY_TEXT.typeUniversityDivision,
  studentBody: DIRECTORY_TEXT.typeStudentBody,
};

const TYPE_ORDER: OrganisationType[] = ["facultyCommittee", "club", "independentGroup", "studentBody", "universityDivision"];

export interface FacultyOption {
  value: string;
  label: string;
}

interface DirectoryFilterFormProps {
  locale: Locale;
  action: string;
  currentType: string;
  currentFaculty: string;
  facultyOptions: FacultyOption[];
}

/**
 * Filters organisations by type and faculty. A real `<form method="get">`
 * with real `<select>`s and a submit button, so choosing a filter and
 * pressing "Apply filters" works with JavaScript off (CONTRIBUTING.md's
 * progressive enhancement rule). With JavaScript, changing either select
 * submits the form immediately, which is only an upgrade of the same
 * mechanism, not a replacement for it.
 */
export function DirectoryFilterForm({ locale, action, currentType, currentFaculty, facultyOptions }: DirectoryFilterFormProps) {
  const typeOptions = [
    { value: "", label: UI.all[locale] },
    ...TYPE_ORDER.map((type) => ({ value: type, label: TYPE_OPTION_LABEL[type][locale] })),
  ];
  const facultySelectOptions = [{ value: "", label: UI.all[locale] }, ...facultyOptions];
  const hasActiveFilter = currentType !== "" || currentFaculty !== "";

  return (
    <Form action={action} aria-label={UI.filter[locale]} className="flex flex-wrap items-end gap-[var(--space-4)]">
      <Select
        id="directory-type"
        name="type"
        label={DIRECTORY_TEXT.typeLabel[locale]}
        options={typeOptions}
        defaultValue={currentType}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      <Select
        id="directory-faculty"
        name="faculty"
        label={DIRECTORY_TEXT.facultyLabel[locale]}
        options={facultySelectOptions}
        defaultValue={currentFaculty}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      <Button type="submit">{UI.applyFilters[locale]}</Button>
      {hasActiveFilter ? (
        <Link href={action} className="text-base text-action underline">
          {UI.clearFilters[locale]}
        </Link>
      ) : null}
    </Form>
  );
}
