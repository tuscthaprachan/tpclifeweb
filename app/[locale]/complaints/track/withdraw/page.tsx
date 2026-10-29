/**
 * Withdraw a complaint: one question, Yes or No, before anything changes. The
 * person must hold the private link (the cookie), and the engine only allows
 * the move for a status the person may choose.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, NotificationBanner, Stack } from "@/components/ui";
import { readTrackCookie, requestContext } from "@/lib/complaints/public/cookies";
import { openTracked } from "@/lib/complaints/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { withdrawComplaint } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints/track/withdraw"),
    title: UI.cpWithdrawTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function WithdrawComplaintPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const track = localePath(locale, "/complaints/track");
  const status = localePath(locale, "/complaints/track/status");

  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(track);
  const meta = await requestContext();
  const tracked = await openTracked(getDb(), cookie.reference, cookie.token, meta.ip);
  if (tracked.state !== "ok") redirect(`${track}?problem=1`);
  if (!tracked.complaint.canWithdraw) redirect(status);
  const failed = first((await searchParams).problem) === "1";

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.cpServiceName[locale], path: "/complaints" },
          { label: UI.cpTrackTitle[locale], path: "/complaints/track" },
          { label: UI.cpWithdrawTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.cpWithdrawTitle[locale]}</Heading>
        {failed ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {UI.cpWithdrawFailed[locale]}
          </NotificationBanner>
        ) : null}
        <p className="m-0 text-ink-900">
          {UI.cpReference[locale]}: <span className="font-semibold">{tracked.complaint.view.reference}</span>
        </p>
        <p className="m-0 text-ink-900">{UI.cpWithdrawBody[locale]}</p>
        <form action={withdrawComplaint} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-wrap items-center gap-[var(--space-4)]">
            <Button type="submit" variant="destructive">
              {UI.cpWithdrawYes[locale]}
            </Button>
            <Link href={status} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
              {UI.cpWithdrawNo[locale]}
            </Link>
          </div>
        </form>
      </Stack>
    </Container>
  );
}
