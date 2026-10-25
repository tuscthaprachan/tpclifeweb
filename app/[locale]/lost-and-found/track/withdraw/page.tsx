/**
 * Withdraw a report: one question, Yes or No, before anything changes. The
 * person must hold the private link (the cookie), and the engine only allows
 * the move for a status the person may choose.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, NotificationBanner, Stack } from "@/components/ui";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { readTrackCookie, requestContext } from "@/lib/lost-found/public/cookies";
import { limitedQuery, openTracked } from "@/lib/lost-found/public/track";
import { withdrawReport } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/lost-and-found/track/withdraw"),
    title: UI.lfpWithdrawTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function WithdrawPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const track = localePath(locale, "/lost-and-found/track");
  const status = localePath(locale, "/lost-and-found/track/status");

  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(track);
  const meta = await requestContext();
  const tracked = await openTracked(getDb(), cookie.reference, cookie.token, meta.ip);
  if (tracked.state === "limited") redirect(`${track}${limitedQuery(tracked.retryAfterSeconds)}`);
  if (tracked.state === "claim") redirect(status);
  if (tracked.state !== "ok") redirect(`${track}?problem=1`);
  if (!tracked.canWithdraw) redirect(status);
  const failed = first((await searchParams).problem) === "1";

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: UI.lfpTrackTitle[locale], path: "/lost-and-found/track" },
          { label: UI.lfpWithdrawTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.lfpWithdrawTitle[locale]}</Heading>
        {failed ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {UI.lfpWithdrawFailed[locale]}
          </NotificationBanner>
        ) : null}
        <p className="m-0 text-ink-900">
          {UI.lostFoundReference[locale]}: <span className="font-semibold">{tracked.view.reference}</span>
        </p>
        <p className="m-0 text-ink-900">{UI.lfpWithdrawBody[locale]}</p>
        <form action={withdrawReport} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-wrap items-center gap-[var(--space-4)]">
            <Button type="submit" variant="destructive">
              {UI.lfpWithdrawYes[locale]}
            </Button>
            <a href={status} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
              {UI.lfpWithdrawNo[locale]}
            </a>
          </div>
        </form>
      </Stack>
    </Container>
  );
}
