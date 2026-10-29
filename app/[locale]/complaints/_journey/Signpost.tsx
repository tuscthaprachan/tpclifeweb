import type { ReactNode } from "react";
import { Button, Container, Heading, InsetText, Stack } from "@/components/ui";
import { bodiesFor } from "@/lib/complaints/redirect";
import type { Faculty } from "@/lib/content/faculties";
import type { DraftValues } from "@/lib/complaints/public/steps";
import { NO_PROGRAMME } from "@/lib/complaints/public/steps";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { continueToTusu } from "./actions";
import { BackLink } from "./BackLink";
import { ExitThisPage } from "./ExitThisPage";
import { BodiesSection, OfficeSection } from "./RedirectSignpost";
import { WellbeingBox } from "./WellbeingBox";

/**
 * Where an issue about a course or a faculty ends: not a complaint to the
 * student union but who to contact, with the contacts an editor has filled in
 * at /admin/content/faculties. Four endings:
 *
 *   course, lecturer yes        how to raise it, then who advises if that fails
 *   course, another reason      the faculty office, with the committee as support
 *   course, harassment/safety   the faculty office, support, an offer of a
 *                               confidential complaint to TUSU and TUSC, and a
 *                               way off the page in one press
 *   faculty                     the chosen programme association, else the
 *                               faculty councils, else its programmes, and the office
 */
export function Signpost({ locale, crumbs, backHref, values, faculty }: { locale: Locale; crumbs: ReactNode; backHref: string; values: DraftValues; faculty: Faculty | null }) {
  const course = values.level === "course";
  const sensitive = course && values.lecturer === "harassment";
  const chosen = values.programme && values.programme !== NO_PROGRAMME ? values.programme : null;
  const bodies = faculty ? bodiesFor(faculty, course ? null : chosen) : [];
  const title = !course ? UI.cpSignFacultyTitle : sensitive ? UI.cpSignSafetyTitle : values.lecturer === "yes" ? UI.cpSignLecturerTitle : UI.cpSignOtherTitle;
  const body = !course ? UI.cpSignFacultyBody : sensitive ? UI.cpSignSafetyBody : values.lecturer === "yes" ? UI.cpSignLecturerBody : UI.cpSignOtherBody;
  const how = [UI.cpSignHow1, UI.cpSignHow2, UI.cpSignHow3, UI.cpSignHow4];

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        {sensitive ? <ExitThisPage label={UI.cpExitPage[locale]} /> : null}
        <BackLink href={backHref} locale={locale} />
        <Stack space={2}>
          <Heading level={1}>{title[locale]}</Heading>
          <p className="m-0 text-ink-900">{body[locale]}</p>
        </Stack>

        {course && values.lecturer === "yes" ? (
          <>
            <Stack space={2} as="section">
              <Heading level={2}>{UI.cpSignHowTitle[locale]}</Heading>
              <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
                {how.map((line, i) => (
                  <li key={i}>{line[locale]}</li>
                ))}
              </ul>
            </Stack>
            <Stack space={2} as="section">
              <Heading level={2}>{UI.cpSignNotResolvedTitle[locale]}</Heading>
              <p className="m-0 text-ink-900">{UI.cpSignNotResolvedBody[locale]}</p>
            </Stack>
          </>
        ) : null}

        {sensitive ? <WellbeingBox locale={locale} /> : null}

        {faculty ? <BodiesSection faculty={faculty} bodies={bodies} locale={locale} /> : null}
        <OfficeSection faculty={faculty} locale={locale} />

        {sensitive ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.cpSignTusuTitle[locale]}</Heading>
            <InsetText>
              <p className="m-0">{UI.cpSignTusuBody[locale]}</p>
            </InsetText>
            <form action={continueToTusu} noValidate>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit">{UI.cpSignTusuButton[locale]}</Button>
            </form>
          </Stack>
        ) : null}

        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <a href={localePath(locale, "/complaints/emergency")} className="text-action underline">
              {UI.cpSignStartAgain[locale]}
            </a>
          </li>
          <li>
            <a href={localePath(locale, "/report")} className="text-action underline">
              {UI.cpSignElse[locale]}
            </a>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
