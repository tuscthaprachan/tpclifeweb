import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectoryFilterForm, groupOrganisations, OrganisationGroup, type FacultyOption } from "@/components/domain/directory";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getOrganisations } from "@/lib/content";
import type { LocaleString, Organisation, OrganisationType } from "@/lib/content/types";
import { alternatesFor } from "@/lib/i18n/metadata";

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

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function facultyOptionsFrom(organisations: Organisation[], locale: Locale): FacultyOption[] {
  const seen = new Map<string, string>();
  for (const org of organisations) {
    if (org.type !== "facultyCommittee" || !org.faculty) continue;
    const key = org.faculty.en || org.faculty.th;
    if (!seen.has(key)) seen.set(key, pick(org.faculty, locale));
  }
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/directory"), title: UI.directory[locale] };
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string | string[]; faculty?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const rawType = readParam(query.type);
  const typeFilter = VALID_TYPES.has(rawType as OrganisationType) ? (rawType as OrganisationType) : "";
  const facultyFilter = readParam(query.faculty);

  const organisations = await getOrganisations();
  const facultyOptions = facultyOptionsFrom(organisations, locale);

  let filtered = organisations;
  if (typeFilter) filtered = filtered.filter((org) => org.type === typeFilter);
  if (facultyFilter) filtered = filtered.filter((org) => org.faculty && (org.faculty.en || org.faculty.th) === facultyFilter);

  const grouped = groupOrganisations(filtered);
  const action = localePath(locale, "/directory");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.directory[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.directory[locale]}</Heading>

        <DirectoryFilterForm
          locale={locale}
          action={action}
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
      </Stack>
    </Container>
  );
}
