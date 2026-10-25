/**
 * Start page for making a complaint. The journey itself is a series of question
 * pages ([step]) that work without JavaScript; this page explains what the
 * service is for, puts the emergency route first, and opens the draft. Nothing
 * is stored until "Start now" is pressed.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { beginJourney } from "./_journey/actions";
import { EmergencyBox } from "./_journey/EmergencyBox";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints"),
    title: UI.cpServiceName[locale],
    description: UI.cpIntro[locale],
  };
}

export default async function ComplaintsStartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;
  const available = isDatabaseConfigured() && isPiiAvailable();

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.cpServiceName[locale] }]} />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.cpServiceName[locale]}</Heading>
          <p className="m-0 text-ink-900">{UI.cpIntro[locale]}</p>
        </Stack>

        <EmergencyBox locale={locale} />

        {first(query.expired) === "1" ? (
          <NotificationBanner variant="info" title={UI.cpExpiredTitle[locale]}>
            {UI.cpExpiredBody[locale]}
          </NotificationBanner>
        ) : null}
        {first(query.problem) === "1" ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {UI.cpSubmitFailed[locale]}
          </NotificationBanner>
        ) : null}

        <Stack space={2} as="section">
          <Heading level={2}>{UI.cpYouChoose[locale]}</Heading>
          <p className="m-0">{UI.cpYouChooseBody[locale]}</p>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            <li>{UI.cpYouChooseNamed[locale]}</li>
            <li>{UI.cpYouChoosePseudonymous[locale]}</li>
            <li>{UI.cpYouChooseAnonymous[locale]}</li>
          </ul>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{UI.cpYouWillNeed[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            <li>{UI.cpNeed1[locale]}</li>
            <li>{UI.cpNeed2[locale]}</li>
            <li>{UI.cpNeed3[locale]}</li>
          </ul>
        </Stack>

        <InsetText>
          <p className="m-0">{UI.cpSensitiveNote[locale]}</p>
        </InsetText>

        {available ? (
          <form action={beginJourney} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit">{UI.cpStartNow[locale]}</Button>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.cpUnavailable[locale]}
          </NotificationBanner>
        )}

        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <a href={localePath(locale, "/complaints/privacy")} className="text-action underline">
              {UI.cpPrivacyLink[locale]}
            </a>
          </li>
          <li>
            <a href={localePath(locale, "/complaints/track")} className="text-action underline">
              {UI.cpTrackLink[locale]}
            </a>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
