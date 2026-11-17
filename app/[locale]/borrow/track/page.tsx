/**
 * Track a loan request. The usual way in is the private link, which sets a
 * cookie and lands on /track/status. This page is the other way: type the
 * reference and paste the link (or its code). Works without JavaScript.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, ErrorSummary, Heading, NotificationBanner, Stack, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { ErrorTitle } from "@/components/ui/ErrorTitle";
import { openTracking } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/borrow/track"),
    title: UI.brTrackTitle[locale],
    description: UI.brTrackIntro[locale],
    referrer: "same-origin",
  };
}

export default async function TrackBorrowPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const problem = first((await searchParams).problem);

  const items: ErrorSummaryItem[] =
    problem === "both"
      ? [
          { href: "#reference", message: UI.brErrTrackRef[locale] },
          { href: "#link", message: UI.brErrTrackLink[locale] },
        ]
      : problem === "ref"
        ? [{ href: "#reference", message: UI.brErrTrackRef[locale] }]
        : problem === "link"
          ? [{ href: "#link", message: UI.brErrTrackLink[locale] }]
          : problem === "limited"
            ? [{ href: "#reference", message: UI.brTrackLimited[locale] }]
            : problem
              ? [{ href: "#reference", message: UI.brTrackProblem[locale] }]
              : [];
  const refError = problem === "ref" || problem === "both" ? UI.brErrTrackRef[locale] : undefined;
  const linkError = problem === "link" || problem === "both" ? UI.brErrTrackLink[locale] : undefined;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.brServiceName[locale], path: "/borrow" },
          { label: UI.brTrackTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        {items.length > 0 ? <ErrorTitle prefix={UI.errorTitlePrefix[locale]} /> : null}
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        <Stack space={2}>
          <Heading level={1}>{UI.brTrackTitle[locale]}</Heading>
          <p className="m-0 text-ink-900">{UI.brTrackIntro[locale]}</p>
        </Stack>
        {isDatabaseConfigured() ? (
          <form action={openTracking} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Stack space={6}>
              <TextInput
                id="reference"
                name="reference"
                label={UI.brTrackRefLabel[locale]}
                hint={UI.brTrackRefHint[locale]}
                error={refError}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <TextInput id="link" name="link" label={UI.brTrackLinkLabel[locale]} hint={UI.brTrackLinkHint[locale]} error={linkError} autoComplete="off" spellCheck={false} />
              <div>
                <Button type="submit">{UI.brTrackSubmit[locale]}</Button>
              </div>
            </Stack>
          </form>
        ) : (
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.brUnavailable[locale]}
          </NotificationBanner>
        )}
        <p className="m-0">
          <Link href={localePath(locale, "/borrow/privacy")} className="text-action underline">
            {UI.brPrivacyLink[locale]}
          </Link>
        </p>
      </Stack>
    </Container>
  );
}
