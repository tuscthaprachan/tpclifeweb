import { contactHref } from "@/components/domain/directory/contactHref";
import { Heading, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
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
export function BodiesSection({ faculty, bodies, locale }: { faculty: Faculty; bodies: FacultyBody[]; locale: Locale }) {
  return (
    <Stack space={2}>
      <Heading level={3}>{UI.cpRedirectBodiesHeading[locale]}</Heading>
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
export function OfficeSection({ faculty, locale }: { faculty: Faculty | null; locale: Locale }) {
  const office = faculty?.office;
  const rows: SummaryListRow[] = office
    ? ([
        office.location ? { key: UI.cpRedirectOfficeLocation[locale], value: pick(office.location, locale) } : null,
        office.phone ? { key: UI.cpRedirectOfficePhone[locale], value: <a href={`tel:${office.phone.replace(/[\s-]/g, "")}`} className="text-action underline">{office.phone}</a> } : null,
        office.email ? { key: UI.cpRedirectOfficeEmail[locale], value: <a href={`mailto:${office.email}`} className="text-action underline">{office.email}</a> } : null,
        office.website ? { key: UI.cpRedirectOfficeWebsite[locale], value: <a href={office.website} target="_blank" rel="noreferrer" className="text-action underline">{office.website}<span className="visually-hidden"> {UI.cpRedirectOpensNewTab[locale]}</span></a> } : null,
        office.note ? { key: UI.cpRedirectOfficeNote[locale], value: <span className="whitespace-pre-line">{pick(office.note, locale)}</span> } : null,
      ] as Array<SummaryListRow | null>).filter((row): row is SummaryListRow => row !== null)
    : [];
  return faculty ? (
    <Stack space={2}>
      <Heading level={3}>
        {UI.cpRedirectOfficeHeading[locale]}: {pick(faculty.name, locale)}
      </Heading>
      {rows.length > 0 ? <SummaryList rows={rows} /> : <p className="m-0 text-ink-900">{UI.cpRedirectOfficeNone[locale]}</p>}
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
