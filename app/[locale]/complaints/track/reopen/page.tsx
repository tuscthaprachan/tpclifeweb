/**
 * Reopen a resolved complaint: one optional question (what is still wrong) and
 * the button. Only offered inside the reopen window; the server checks the
 * window again when the form is posted.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, ErrorSummary, Heading, Stack, Textarea, type ErrorSummaryItem } from "@/components/ui";
import { readTrackCookie, requestContext } from "@/lib/complaints/public/cookies";
import { openTracked } from "@/lib/complaints/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { reopenComplaintAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints/track/reopen"),
    title: UI.cpReopenTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function ReopenComplaintPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
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
  const c = tracked.complaint;
  if (!c.canReopen || !c.reopenUntil) redirect(status);

  const problem = first((await searchParams).problem);
  const items: ErrorSummaryItem[] = problem === "long" ? [{ href: "#reason", message: UI.cpErrReasonLong[locale] }] : problem ? [{ href: "#reason", message: UI.cpReopenFailed[locale] }] : [];

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.cpServiceName[locale], path: "/complaints" },
          { label: UI.cpTrackTitle[locale], path: "/complaints/track" },
          { label: UI.cpReopenTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.cpReopenTitle[locale]}</Heading>
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        <p className="m-0 text-ink-900">
          {UI.cpReference[locale]}: <span className="font-semibold">{c.view.reference}</span>
        </p>
        <p className="m-0 text-ink-900">{UI.cpReopenBody[locale].replace("{date}", formatDate(c.reopenUntil, locale))}</p>
        <form action={reopenComplaintAction} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Stack space={6}>
            <Textarea id="reason" name="reason" label={UI.cpReopenReasonLabel[locale]} hint={UI.cpReopenReasonHint[locale]} error={problem === "long" ? UI.cpErrReasonLong[locale] : undefined} rows={5} autoComplete="off" />
            <div className="flex flex-wrap items-center gap-[var(--space-4)]">
              <Button type="submit">{UI.cpReopenYes[locale]}</Button>
              <a href={status} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
                {UI.cpReopenNo[locale]}
              </a>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
