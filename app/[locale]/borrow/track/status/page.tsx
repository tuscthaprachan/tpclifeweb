/**
 * What the person is allowed to see of their request: its public status, the
 * period, the items and quantities, the public updates staff wrote (the
 * decision, and a reason if it was declined), and the one thing they can do,
 * cancel it until it is collected. The cookie from /track/link (or the track
 * form) holds the reference and private token; they are checked, and counted
 * against the address's attempt limit, on every view.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, NotificationBanner, Stack, StatusTag, SummaryList, Timestamp, type SummaryListRow } from "@/components/ui";
import { getStatusDef, localisedBody } from "@/lib/cases";
import { readTrackCookie, requestContext } from "@/lib/borrowing/public/cookies";
import { openTracked } from "@/lib/borrowing/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { Unavailable } from "../../_journey/Unavailable";
import { forgetTracking } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/borrow/track/status"),
    title: UI.brStatusTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function BorrowStatusPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const track = localePath(locale, "/borrow/track");
  const query = await searchParams;

  const cookie = await readTrackCookie();
  if (!cookie) redirect(track);
  if (!isDatabaseConfigured()) return <Unavailable locale={locale} title={UI.brStatusTitle[locale]} />;

  const meta = await requestContext();
  const tracked = await openTracked(getDb(), cookie.reference, cookie.token, meta.ip);
  if (tracked.state === "none") redirect(`${track}?problem=1`);
  if (tracked.state === "limited") redirect(`${track}?problem=limited`);
  const { loan } = tracked;
  const { view } = loan;

  const tone = getStatusDef(view.service, view.kind, view.status)?.tone ?? "neutral";
  const rows: SummaryListRow[] = [
    { key: UI.brReference[locale], value: <span className="font-semibold">{view.reference}</span> },
    { key: UI.brStatusNow[locale], value: <StatusTag tone={tone} label={pick(view.statusLabel, locale)} /> },
    { key: UI.brCollect[locale], value: <Timestamp value={loan.collectAt} locale={locale} format="datetime" /> },
    { key: UI.brReturn[locale], value: <Timestamp value={loan.returnDueAt} locale={locale} format="datetime" /> },
    { key: UI.brRequestedOn[locale], value: <Timestamp value={view.createdAt} locale={locale} format="datetime" /> },
    { key: UI.brLastUpdated[locale], value: <Timestamp value={view.updatedAt} locale={locale} format="datetime" /> },
  ];

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.brServiceName[locale], path: "/borrow" },
          { label: UI.brTrackTitle[locale], path: "/borrow/track" },
          { label: UI.brStatusTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.brStatusTitle[locale]}</Heading>

        {first(query.cancelled) === "1" && view.status === "cancelled" ? (
          <NotificationBanner variant="success" title={UI.brCancelledBanner[locale]}>
            {UI.brCancelledBannerBody[locale]}
          </NotificationBanner>
        ) : null}

        <SummaryList rows={rows} />

        <Stack space={2} as="section">
          <Heading level={2}>{UI.brItemsHeading[locale]}</Heading>
          <SummaryList rows={loan.lines.map((line) => ({ key: pick(line.name, locale), value: `${line.quantity} ${pick(line.unit, locale)}` }))} />
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.brProgress[locale]}</Heading>
          <ol className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
            {view.timeline.map((entry) => {
              const body = localisedBody(entry.body, locale);
              return (
                <li key={entry.id} className="border-l-[length:var(--border-width-thick)] border-line-strong pl-[var(--space-4)]">
                  <p className="m-0 font-semibold text-ink-900">{pick(entry.title, locale)}</p>
                  <p className="m-0 text-sm text-ink-600">
                    <Timestamp value={entry.at} locale={locale} format="datetime" />
                  </p>
                  {body ? (
                    <p className="m-0 mt-[var(--space-1)] whitespace-pre-line text-ink-900" lang={body.lang}>
                      {body.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Stack>

        {loan.canCancel ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.brYouCan[locale]}</Heading>
            <p className="m-0">
              <a href={localePath(locale, "/borrow/track/cancel")} className="text-action underline">
                {UI.brCancelLink[locale]}
              </a>
            </p>
          </Stack>
        ) : null}

        <form action={forgetTracking} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Stack space={2}>
            <p className="m-0 text-sm text-ink-600">{UI.brForgetNote[locale]}</p>
            <div>
              <Button type="submit" variant="secondary">
                {UI.brForgetThisDevice[locale]}
              </Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
