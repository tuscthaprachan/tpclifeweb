import { Heading, Stack } from "@/components/ui";
import type { FacultyOffice } from "@/lib/content/faculties";
import type { Organisation } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";
import { AudienceTag } from "./AudienceTag";
import { FacultyOfficeDetails } from "./FacultyOfficeDetails";
import { OrganisationGroup } from "./OrganisationGroup";
import { DIRECTORY_TEXT } from "./strings";

interface FacultySectionProps {
  id: string;
  heading: string;
  locale: Locale;
  office: FacultyOffice | undefined;
  showOffice: boolean;
  committees: Organisation[];
  showNoCommittees: boolean;
}

export function FacultySection({ id, heading, locale, office, showOffice, committees, showNoCommittees }: FacultySectionProps) {
  return (
    <section id={id}>
      <Stack space={4}>
        <Heading level={2}>{heading}</Heading>
        {showOffice ? (
          <section>
            <Stack space={2}>
              <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                <Heading level={3}>{DIRECTORY_TEXT.officeHeading[locale]}</Heading>
                <AudienceTag audience="staff" locale={locale} />
              </div>
              <p className="m-0 text-sm text-ink-600">{DIRECTORY_TEXT.officeIntro[locale]}</p>
              <FacultyOfficeDetails office={office} locale={locale} empty={DIRECTORY_TEXT.officeNone[locale]} />
            </Stack>
          </section>
        ) : null}
        {committees.length > 0 ? (
          <OrganisationGroup
            heading={DIRECTORY_TEXT.committeesHeading[locale]}
            headingLevel={3}
            organisations={committees}
            locale={locale}
            audience="students"
            intro={DIRECTORY_TEXT.committeesIntro[locale]}
          />
        ) : showNoCommittees ? (
          <section>
            <Stack space={2}>
              <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                <Heading level={3}>{DIRECTORY_TEXT.committeesHeading[locale]}</Heading>
                <AudienceTag audience="students" locale={locale} />
              </div>
              <p className="m-0 text-ink-900">{DIRECTORY_TEXT.committeesNone[locale]}</p>
            </Stack>
          </section>
        ) : null}
      </Stack>
    </section>
  );
}
