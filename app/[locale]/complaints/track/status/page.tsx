/**
 * What the person is allowed to see of their complaint: its public status, the
 * dates we aim to meet, public updates, the outcome once there is one, and the
 * things they can do (withdraw, say how it went, reopen). The cookie from
 * /track/link (or the track form) holds the reference and private token; they
 * are checked, and counted against the address's attempt limit, on every view.
 * If they do not match, the person is sent to the track form with a generic
 * message.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack, StatusTag, SummaryList, Timestamp, type SummaryListRow } from "@/components/ui";
import { getStatusDef, localisedBody } from "@/lib/cases";
import { readTrackCookie, requestContext } from "@/lib/complaints/public/cookies";
import { openTracked } from "@/lib/complaints/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { Unavailable } from "../../_journey/Unavailable";
import { WellbeingBox } from "../../_journey/WellbeingBox";
import { forgetTracking } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints/track/status"),
    title: UI.cpStatusTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function ComplaintStatusPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const track = localePath(locale, "/complaints/track");
  const query = await searchParams;

  const cookie = await readTrackCookie();
  if (!cookie) redirect(track);
  if (!isDatabaseConfigured()) return <Unavailable locale={locale} title={UI.cpStatusTitle[locale]} />;

  const meta = await requestContext();
  const tracked = await openTracked(getDb(), cookie.reference, cookie.token, meta.ip);
  if (tracked.state === "none") redirect(`${track}?problem=1`);
  if (tracked.state === "limited") redirect(`${track}?problem=limited`);
  const c = tracked.complaint;
  const { view } = c;

  const tone = getStatusDef(view.service, view.kind, view.status)?.tone ?? "neutral";
  const open = !["resolved", "closed", "withdrawn"].includes(view.status);
  const outcome = localisedBody(c.outcome, locale);
  const rows: SummaryListRow[] = [
    { key: UI.cpReference[locale], value: <span className="font-semibold">{view.reference}</span> },
    { key: UI.cpStatusNow[locale], value: <StatusTag tone={tone} label={pick(view.statusLabel, locale)} /> },
    { key: UI.cpReceivedOn[locale], value: <Timestamp value={view.createdAt} locale={locale} format="datetime" /> },
    { key: UI.cpLastUpdated[locale], value: <Timestamp value={view.updatedAt} locale={locale} format="datetime" /> },
    { key: UI.cpCategoryRow[locale], value: pick(c.category.name, locale) },
  ];
  if (open && !c.acknowledgedAt) rows.push({ key: UI.cpAimAcknowledge[locale], value: formatDate(c.acknowledgeDueAt, locale) });
  if (open) rows.push({ key: UI.cpAimResolve[locale], value: formatDate(c.resolveDueAt, locale) });

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.cpServiceName[locale], path: "/complaints" },
          { label: UI.cpTrackTitle[locale], path: "/complaints/track" },
          { label: UI.cpStatusTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.cpStatusTitle[locale]}</Heading>

        {first(query.withdrawn) === "1" && view.status === "withdrawn" ? (
          <NotificationBanner variant="success" title={UI.cpWithdrawnBanner[locale]}>
            {UI.cpWithdrawnBannerBody[locale]}
          </NotificationBanner>
        ) : null}
        {first(query.reopened) === "1" && view.status === "reopened" ? (
          <NotificationBanner variant="success" title={UI.cpReopenedBanner[locale]}>
            {UI.cpReopenedBannerBody[locale]}
          </NotificationBanner>
        ) : null}
        {first(query.survey) === "1" ? (
          <NotificationBanner variant="success" title={UI.cpSurveyThanks[locale]}>
            {null}
          </NotificationBanner>
        ) : null}

        <SummaryList rows={rows} />

        {outcome ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.cpOutcome[locale]}</Heading>
            <p className="m-0 whitespace-pre-line text-ink-900" lang={outcome.lang}>
              {outcome.text}
            </p>
          </Stack>
        ) : null}

        {c.category.offerWellbeing || c.wellbeingRouted ? <WellbeingBox locale={locale} /> : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.cpProgress[locale]}</Heading>
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

        {c.identity === "anonymous" ? (
          <InsetText>
            <p className="m-0">{UI.cpStatusAnonymous[locale]}</p>
          </InsetText>
        ) : null}

        {c.survey === "open" || c.canReopen || c.canWithdraw ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.cpYouCan[locale]}</Heading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
              {c.survey === "open" ? (
                <li>
                  <a href={localePath(locale, "/complaints/track/survey")} className="text-action underline">
                    {UI.cpSurveyLink[locale]}
                  </a>
                </li>
              ) : null}
              {c.canReopen && c.reopenUntil ? (
                <li>
                  <a href={localePath(locale, "/complaints/track/reopen")} className="text-action underline">
                    {UI.cpReopenLink[locale]}
                  </a>{" "}
                  <span className="text-ink-600">{UI.cpReopenUntil[locale].replace("{date}", formatDate(c.reopenUntil, locale))}</span>
                </li>
              ) : null}
              {c.canWithdraw ? (
                <li>
                  <a href={localePath(locale, "/complaints/track/withdraw")} className="text-action underline">
                    {UI.cpWithdrawLink[locale]}
                  </a>
                </li>
              ) : null}
            </ul>
          </Stack>
        ) : null}

        <form action={forgetTracking} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Stack space={2}>
            <p className="m-0 text-sm text-ink-600">{UI.cpForgetNote[locale]}</p>
            <div>
              <Button type="submit" variant="secondary">
                {UI.cpForgetThisDevice[locale]}
              </Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
