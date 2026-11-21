import { Heading, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import type { FacultyOffice, ProgrammeOffice } from "@/lib/content/faculties";
import type { OrganisationContact } from "@/lib/content/types";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ContactList } from "./ContactList";
import { DIRECTORY_TEXT } from "./strings";

const websiteHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export function facultyOfficeRows(office: FacultyOffice, locale: Locale): SummaryListRow[] {
  const link = "text-action underline";
  return ([
    office.location ? { key: UI.cpRedirectOfficeLocation[locale], value: pick(office.location, locale) } : null,
    office.phone ? { key: UI.cpRedirectOfficePhone[locale], value: <a href={`tel:${office.phone.replace(/[\s-]/g, "")}`} className={link}>{office.phone}</a> } : null,
    office.email ? { key: UI.cpRedirectOfficeEmail[locale], value: <a href={`mailto:${office.email}`} className={link}>{office.email}</a> } : null,
    office.website
      ? {
          key: UI.cpRedirectOfficeWebsite[locale],
          value: (
            <a href={websiteHref(office.website)} target="_blank" rel="noreferrer" className={link}>
              {office.website}
              <span className="visually-hidden"> {UI.cpRedirectOpensNewTab[locale]}</span>
            </a>
          ),
        }
      : null,
    office.note ? { key: UI.cpRedirectOfficeNote[locale], value: <span className="whitespace-pre-line">{pick(office.note, locale)}</span> } : null,
  ] as Array<SummaryListRow | null>).filter((row): row is SummaryListRow => row !== null);
}

function programmeContacts(office: ProgrammeOffice): OrganisationContact[] {
  const contacts: OrganisationContact[] = [];
  for (const channel of ["email", "phone", "website"] as const) {
    const value = office[channel];
    if (value) contacts.push({ _key: channel, channel, value });
  }
  return contacts;
}

export function ProgrammeOfficeList({ offices, locale, headingLevel }: { offices: ProgrammeOffice[]; locale: Locale; headingLevel: HeadingLevel }) {
  if (offices.length === 0) return null;
  return (
    <section>
      <Stack space={2}>
        <Heading level={headingLevel}>{DIRECTORY_TEXT.programmeOfficesHeading[locale]}</Heading>
        <p className="m-0 text-sm text-ink-600">{DIRECTORY_TEXT.programmeOfficesIntro[locale]}</p>
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {offices.map((office, index) => (
            <li key={index} className="py-[var(--space-3)]">
              <p className="m-0 font-semibold text-ink-900">{pick(office.name, locale)}</p>
              <ContactList contacts={programmeContacts(office)} locale={locale} />
            </li>
          ))}
        </ul>
      </Stack>
    </section>
  );
}

interface FacultyOfficeDetailsProps {
  office: FacultyOffice | undefined;
  programmeOffices: ProgrammeOffice[];
  locale: Locale;
  empty: string;
  programmeHeadingLevel: HeadingLevel;
}

export function FacultyOfficeDetails({ office, programmeOffices, locale, empty, programmeHeadingLevel }: FacultyOfficeDetailsProps) {
  const rows = office ? facultyOfficeRows(office, locale) : [];
  return (
    <>
      {rows.length > 0 ? <SummaryList rows={rows} /> : programmeOffices.length === 0 ? <p className="m-0 text-ink-900">{empty}</p> : null}
      <ProgrammeOfficeList offices={programmeOffices} locale={locale} headingLevel={programmeHeadingLevel} />
    </>
  );
}
