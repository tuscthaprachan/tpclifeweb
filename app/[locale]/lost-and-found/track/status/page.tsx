/**
 * What the person is allowed to see of their case: its public status and
 * public timeline, nothing else. A claimant's link shows their own claim only:
 * its status, where to collect once accepted and the messages staff wrote for
 * that claim, never anything about other claimants. The cookie from /track/link (or the track
 * form) holds the reference and private token; they are checked, and counted
 * against the address's attempt limit, on every view. If they do not match,
 * the person is sent to the track form with a generic message.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, NotificationBanner, Stack, StatusTag, SummaryList, Timestamp } from "@/components/ui";
import { getStatusDef, localisedBody, type PublicBody } from "@/lib/cases";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { readTrackCookie, requestContext } from "@/lib/lost-found/public/cookies";
import type { ClaimStage, ClaimTrackView } from "@/lib/lost-found/public/claim-view";
import { limitedQuery, openTracked } from "@/lib/lost-found/public/track";
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
    referrer: "same-origin",
  };
}

const CLAIM_TONE: Record<ClaimStage, "info" | "success" | "neutral"> = { waiting: "info", accepted: "success", not_accepted: "neutral", returned: "success" };

/** A message from staff in the reader's language, or the other one, marked with its own `lang`. */
function Message({ body, locale }: { body: PublicBody | null; locale: Locale }) {
  const shown = localisedBody(body, locale);
  return shown ? (
    <p lang={shown.lang} className="m-0 mt-[var(--space-1)] whitespace-pre-line text-ink-900">
      {shown.text}
    </p>
  ) : null;
}

function ForgetForm({ locale }: { locale: Locale }) {
  return (
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
  );
}

function ClaimStatus({ claim, locale }: { claim: ClaimTrackView; locale: Locale }) {
  const title = UI.lfpStatusTitleClaim[locale];
  const collection = localisedBody(claim.collectionNote, locale);
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

        <SummaryList
          rows={[
            { key: UI.lostFoundReference[locale], value: <span className="font-semibold">{claim.reference}</span> },
            { key: UI.lfpStatusNow[locale], value: <StatusTag tone={CLAIM_TONE[claim.stage]} label={pick(claim.statusLabel, locale)} /> },
            ...(claim.desk ? [{ key: UI.lfpClaimWhere[locale], value: pick(claim.desk, locale) }] : []),
            ...(claim.stage === "accepted"
              ? [
                  {
                    key: UI.lfpClaimCollectionDetails[locale],
                    value: collection ? (
                      <span lang={collection.lang} className="whitespace-pre-line">
                        {collection.text}
                      </span>
                    ) : (
                      UI.lfpNextClaim2[locale]
                    ),
                  },
                ]
              : []),
            { key: UI.lfpReportedOn[locale], value: <Timestamp value={claim.submittedAt} locale={locale} format="datetime" /> },
            { key: UI.lfpLastUpdated[locale], value: <Timestamp value={claim.updatedAt} locale={locale} format="datetime" /> },
          ]}
        />
        {claim.stage === "waiting" ? <p className="m-0 text-ink-900">{UI.lfpNextClaim1[locale]}</p> : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.lfpProgress[locale]}</Heading>
          <ol className="m-0 list-none border-t border-line p-0">
            {claim.timeline.map((entry) => (
              <li key={entry.id} className="border-b border-line py-[var(--space-3)]">
                <p className="m-0 font-semibold text-ink-900">{pick(entry.title, locale)}</p>
                <p className="m-0 text-sm text-ink-600">
                  <Timestamp value={entry.at} locale={locale} format="datetime" />
                </p>
                <Message body={entry.body} locale={locale} />
              </li>
            ))}
          </ol>
        </Stack>

        <ForgetForm locale={locale} />
      </Stack>
    </Container>
  );
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
  if (tracked.state === "limited") redirect(`${track}${limitedQuery(tracked.retryAfterSeconds)}`);
  if (tracked.state === "claim") return <ClaimStatus claim={tracked.claim} locale={locale} />;
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
          <ol className="m-0 list-none border-t border-line p-0">
            {view.timeline.map((entry) => (
              <li key={entry.id} className="border-b border-line py-[var(--space-3)]">
                <p className="m-0 font-semibold text-ink-900">{pick(entry.title, locale)}</p>
                <p className="m-0 text-sm text-ink-600">
                  <Timestamp value={entry.at} locale={locale} format="datetime" />
                </p>
                <Message body={entry.body} locale={locale} />
              </li>
            ))}
          </ol>
        </Stack>

        {canWithdraw ? (
          <p className="m-0">
            <Link href={localePath(locale, "/lost-and-found/track/withdraw")} className="text-action underline">
              {UI.lfpWithdrawLink[locale]}
            </Link>
          </p>
        ) : null}

        <ForgetForm locale={locale} />
      </Stack>
    </Container>
  );
}
