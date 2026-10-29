/**
 * The start page of a journey: what it is for, what you will need, "Start now"
 * (a form post that opens the draft), and links to the privacy notice and to
 * tracking. Shown instead with a plain notice when the service cannot take
 * personal data right now.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { isDatabaseConfigured } from "@/lib/db";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { JourneyKind } from "@/lib/lost-found/public/steps";
import { beginJourney } from "./actions";
import { journeyName } from "./copy";

interface StartPageProps {
  kind: JourneyKind;
  locale: Locale;
  slug?: string;
  intro: string;
  need: readonly string[];
  /** Extra guidance shown above the list, such as the desk note for finders. */
  note?: string;
  /** The listing being claimed, shown under the heading. */
  subject?: ReactNode;
  expired?: boolean;
  problem?: boolean;
}

export function StartPage({ kind, locale, slug, intro, need, note, subject, expired, problem }: StartPageProps) {
  const available = isDatabaseConfigured() && isPiiAvailable();
  const name = journeyName(kind, locale);
  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: name },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{name}</Heading>
          {subject}
          <p className="m-0 text-ink-900">{intro}</p>
        </Stack>

        {expired ? (
          <NotificationBanner variant="info" title={UI.lfpExpiredTitle[locale]}>
            {UI.lfpExpiredBody[locale]}
          </NotificationBanner>
        ) : null}
        {problem ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {UI.lfpSubmitFailed[locale]}
          </NotificationBanner>
        ) : null}

        {note ? <InsetText>{note}</InsetText> : null}

        <Stack space={2} as="section">
          <Heading level={2}>{UI.lfpYouWillNeed[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {need.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Stack>

        {available ? (
          <form action={beginJourney} noValidate>
            <input type="hidden" name="journey" value={kind} />
            <input type="hidden" name="locale" value={locale} />
            {slug ? <input type="hidden" name="slug" value={slug} /> : null}
            <Button type="submit">{UI.lfpStartNow[locale]}</Button>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.lfpUnavailable[locale]}
          </NotificationBanner>
        )}

        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <Link href={localePath(locale, "/lost-and-found/privacy")} className="text-action underline">
              {UI.lfpPrivacyLink[locale]}
            </Link>
          </li>
          <li>
            <Link href={localePath(locale, "/lost-and-found/track")} className="text-action underline">
              {UI.lfpTrackLink[locale]}
            </Link>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
