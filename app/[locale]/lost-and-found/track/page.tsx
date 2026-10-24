/**
 * Track a report. The usual way in is the private link, which sets a cookie
 * and lands on /track/status. This page is the other way: type the reference
 * and paste the link (or its code). Works without JavaScript.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, ErrorSummary, Heading, NotificationBanner, Stack, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { openTracking } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/lost-and-found/track"),
    title: UI.lfpTrackTitle[locale],
    description: UI.lfpTrackIntro[locale],
    referrer: "same-origin",
  };
}

export default async function TrackPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const problem = first((await searchParams).problem);

  const items: ErrorSummaryItem[] =
    problem === "ref"
      ? [{ href: "#reference", message: UI.lfpErrTrackRef[locale] }]
      : problem === "link"
        ? [{ href: "#link", message: UI.lfpErrTrackLink[locale] }]
        : problem === "limited"
          ? [{ href: "#reference", message: UI.lfpTrackLimited[locale] }]
          : problem
            ? [{ href: "#reference", message: UI.lfpTrackProblem[locale] }]
            : [];

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: UI.lfpTrackTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.lfpTrackTitle[locale]}</Heading>
          <p className="m-0 text-ink-900">{UI.lfpTrackIntro[locale]}</p>
        </Stack>
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        {isDatabaseConfigured() ? (
          <form action={openTracking} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Stack space={6}>
              <TextInput
                id="reference"
                name="reference"
                label={UI.lfpTrackRefLabel[locale]}
                hint={UI.lfpTrackRefHint[locale]}
                error={problem === "ref" ? UI.lfpErrTrackRef[locale] : undefined}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <TextInput
                id="link"
                name="link"
                label={UI.lfpTrackLinkLabel[locale]}
                hint={UI.lfpTrackLinkHint[locale]}
                error={problem === "link" ? UI.lfpErrTrackLink[locale] : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <div>
                <Button type="submit">{UI.lfpTrackSubmit[locale]}</Button>
              </div>
            </Stack>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.lfpUnavailable[locale]}
          </NotificationBanner>
        )}
        <p className="m-0">
          <a href={localePath(locale, "/lost-and-found/privacy")} className="text-action underline">
            {UI.lfpPrivacyLink[locale]}
          </a>
        </p>
      </Stack>
    </Container>
  );
}
