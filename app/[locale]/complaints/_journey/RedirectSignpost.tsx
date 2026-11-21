import { AudienceTag } from "@/components/domain/directory/AudienceTag";
import { contactHref } from "@/components/domain/directory/contactHref";
import { FacultyOfficeDetails } from "@/components/domain/directory/FacultyOfficeDetails";
import { DIRECTORY_TEXT } from "@/components/domain/directory/strings";
import { Heading, Stack } from "@/components/ui";
import type { Faculty, FacultyBody } from "@/lib/content/faculties";
import type { RedirectTarget } from "@/lib/complaints/redirect";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/**
 * Who to contact instead of the student union: the faculty's student council
 * or the programme association (their Instagram), and the faculty office with
 * whatever an editor has filled in. For a course it says the lecturer has the
 * final say and, if the student cannot raise it with them, to go to the
 * faculty office. `RedirectSignpost` is shown on the tracking page of a
 * redirected complaint; the two sections are also the body of the signpost
 * pages of the issue reporting journey (./Signpost.tsx).
 */

function BodyItem({ body, locale }: { body: FacultyBody; locale: Locale }) {
  const instagram = body.contacts.filter((c) => c.channel === "instagram");
  return (
    <li>
      <span className="font-semibold">{pick(body.name, locale)}</span>
      {body.programme ? <span className="block text-ink-600">{UI.cpRedirectProgramme[locale].replace("{programme}", pick(body.programme, locale))}</span> : null}
      {instagram.map((c) => (
        <a key={c._key} href={contactHref(c) ?? undefined} target="_blank" rel="noreferrer" className="block text-action underline">
          Instagram @{c.value}
          <span className="visually-hidden"> {UI.cpRedirectOpensNewTab[locale]}</span>
        </a>
      ))}
    </li>
  );
}

/** The student bodies to contact, or a line saying we list none for the faculty. */
export function BodiesSection({ faculty, bodies, locale, level = 3 }: { faculty: Faculty; bodies: FacultyBody[]; locale: Locale; level?: 2 | 3 }) {
  return (
    <Stack space={2}>
      <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <Heading level={level}>{UI.cpRedirectBodiesHeading[locale]}</Heading>
        <AudienceTag audience="students" locale={locale} />
      </div>
      <p className="m-0 text-sm text-ink-600">{DIRECTORY_TEXT.committeesIntro[locale]}</p>
      {bodies.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
          {bodies.map((body) => (
            <BodyItem key={body._id} body={body} locale={locale} />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-ink-900">{UI.cpRedirectNoBodies[locale].replace("{faculty}", pick(faculty.name, locale))}</p>
      )}
    </Stack>
  );
}

/** The faculty office with whatever an editor has filled in, or a line saying we have no details yet. */
export function OfficeSection({ faculty, locale, level = 3 }: { faculty: Faculty | null; locale: Locale; level?: 2 | 3 }) {
  return faculty ? (
    <Stack space={2}>
      <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <Heading level={level}>
          {UI.cpRedirectOfficeHeading[locale]}: {pick(faculty.name, locale)}
        </Heading>
        <AudienceTag audience="staff" locale={locale} />
      </div>
      <p className="m-0 text-sm text-ink-600">{DIRECTORY_TEXT.officeIntro[locale]}</p>
      <FacultyOfficeDetails office={faculty.office} locale={locale} empty={UI.cpRedirectOfficeNone[locale]} />
    </Stack>
  ) : (
    <p className="m-0 text-ink-900">{UI.cpRedirectGone[locale]}</p>
  );
}

export function RedirectSignpost({ target, locale }: { target: RedirectTarget; locale: Locale }) {
  const { faculty, bodies, level } = target;
  return (
    <Stack space={4} as="section">
      <Heading level={2}>{UI.cpRedirectHeading[locale]}</Heading>
      <p className="m-0 text-ink-900">{level === "course" ? UI.cpRedirectCourseIntro[locale] : UI.cpRedirectFacultyIntro[locale]}</p>
      {level === "faculty" && faculty ? <BodiesSection faculty={faculty} bodies={bodies} locale={locale} /> : null}
      {level === "course" ? <p className="m-0 text-ink-900">{UI.cpRedirectCourseOffice[locale]}</p> : null}
      <OfficeSection faculty={faculty} locale={locale} />
    </Stack>
  );
}
