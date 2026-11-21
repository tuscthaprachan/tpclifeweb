/**
 * Start page for reporting an issue. The journey itself is a series of question
 * pages ([step]) that work without JavaScript; this page explains what the
 * service is for and who deals with what, puts the emergency numbers first,
 * and opens the draft. Nothing is stored until "Start now" is pressed.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack, PageTitle } from "@/components/ui";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getServicePageText } from "@/lib/content/service-text";
import { listItems } from "@/lib/content/service-pages";
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
    description: (await getServicePageText("complaints")).intro[locale],
  };
}

export default async function ComplaintsStartPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;
  const available = isDatabaseConfigured() && isPiiAvailable();
  const t = await getServicePageText("complaints");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.cpServiceName[locale] }]} />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <PageTitle path="/complaints">{UI.cpServiceName[locale]}</PageTitle>
          <p className="m-0 text-ink-900">{t.intro[locale]}</p>
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
          <Heading level={2}>{t.levelsHeading[locale]}</Heading>
          <p className="m-0">{t.levelsBody[locale]}</p>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {listItems(t.levels[locale]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{t.chooseHeading[locale]}</Heading>
          <p className="m-0">{t.chooseBody[locale]}</p>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {listItems(t.choose[locale]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{t.needHeading[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {listItems(t.need[locale]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Stack>

        <InsetText>
          <p className="m-0">{t.sensitiveNote[locale]}</p>
        </InsetText>

        {available ? (
          <form action={beginJourney} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit">{UI.cpStartNow[locale]}</Button>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {t.unavailable[locale]}
          </NotificationBanner>
        )}

        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <Link href={localePath(locale, "/complaints/privacy")} className="text-action underline">
              {UI.cpPrivacyLink[locale]}
            </Link>
          </li>
          <li>
            <Link href={localePath(locale, "/complaints/track")} className="text-action underline">
              {UI.cpTrackLink[locale]}
            </Link>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
