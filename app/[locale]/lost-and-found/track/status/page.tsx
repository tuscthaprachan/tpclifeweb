/**
 * What the person is allowed to see of their case: its public status and
 * public timeline, nothing else. The cookie from /track/link (or the track
 * form) holds the reference and private token; they are checked, and counted
 * against the address's attempt limit, on every view. If they do not match,
 * the person is sent to the track form with a generic message.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, NotificationBanner, Stack, StatusTag, SummaryList, Timestamp } from "@/components/ui";
import { getStatusDef } from "@/lib/cases";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { readTrackCookie, requestContext } from "@/lib/lost-found/public/cookies";
import { openTracked } from "@/lib/lost-found/public/track";
import { Unavailable } from "../../_journey/Unavailable";
import { forgetTracking } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/lost-and-found/track/status"),
    title: UI.lfpStatusTitleReport[locale],
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function TrackStatusPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const track = localePath(locale, "/lost-and-found/track");
  const withdrawnNow = first((await searchParams).withdrawn) === "1";

  const cookie = await readTrackCookie();
  if (!cookie) redirect(track);
  if (!isDatabaseConfigured()) return <Unavailable locale={locale} title={UI.lfpStatusTitleReport[locale]} />;

  const meta = await requestContext();
  const tracked = await openTracked(getDb(), cookie.reference, cookie.token, meta.ip);
  if (tracked.state === "none") redirect(`${track}?problem=1`);
  if (tracked.state === "limited") redirect(`${track}?problem=limited`);
  const { view, canWithdraw } = tracked;

  const tone = getStatusDef(view.service, view.kind, view.status)?.tone ?? "neutral";
  const title = view.kind === "lost" ? UI.lfpStatusTitleReport[locale] : UI.lfpStatusTitleItem[locale];

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: UI.lfpTrackTitle[locale], path: "/lost-and-found/track" },
          { label: title },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{title}</Heading>

        {withdrawnNow && view.status === "withdrawn" ? (
          <NotificationBanner variant="success" title={UI.lfpWithdrawnBanner[locale]}>
            {UI.lfpWithdrawnBannerBody[locale]}
          </NotificationBanner>
        ) : null}

        <SummaryList
          rows={[
            { key: UI.lostFoundReference[locale], value: <span className="font-semibold">{view.reference}</span> },
            { key: UI.lfpStatusNow[locale], value: <StatusTag tone={tone} label={pick(view.statusLabel, locale)} /> },
            { key: UI.lfpReportedOn[locale], value: <Timestamp value={view.createdAt} locale={locale} format="datetime" /> },
            { key: UI.lfpLastUpdated[locale], value: <Timestamp value={view.updatedAt} locale={locale} format="datetime" /> },
          ]}
        />

        <Stack space={3} as="section">
          <Heading level={2}>{UI.lfpProgress[locale]}</Heading>
          <ol className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
            {view.timeline.map((entry) => (
              <li key={entry.id} className="border-l-[length:var(--border-width-thick)] border-line-strong pl-[var(--space-4)]">
                <p className="m-0 font-semibold text-ink-900">{pick(entry.title, locale)}</p>
                <p className="m-0 text-sm text-ink-600">
                  <Timestamp value={entry.at} locale={locale} format="datetime" />
                </p>
                {entry.body ? <p className="m-0 mt-[var(--space-1)] whitespace-pre-line text-ink-900">{pick(entry.body, locale)}</p> : null}
              </li>
            ))}
          </ol>
        </Stack>

        {canWithdraw ? (
          <p className="m-0">
            <a href={localePath(locale, "/lost-and-found/track/withdraw")} className="text-action underline">
              {UI.lfpWithdrawLink[locale]}
            </a>
          </p>
        ) : null}

        <form action={forgetTracking} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Stack space={2}>
            <p className="m-0 text-sm text-ink-600">{UI.lfpForgetNote[locale]}</p>
            <div>
              <Button type="submit" variant="secondary">
                {UI.lfpForgetThisDevice[locale]}
              </Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
