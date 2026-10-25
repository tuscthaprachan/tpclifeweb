/**
 * The satisfaction survey after a resolution: a score from 1 to 5 and an
 * optional comment. One question and one optional box; the score is kept for
 * performance reporting, the comment is encrypted and deleted with the rest of
 * the personal data.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, ErrorSummary, Heading, Radios, Stack, Textarea, type ErrorSummaryItem } from "@/components/ui";
import { readTrackCookie, requestContext } from "@/lib/complaints/public/cookies";
import { openTracked } from "@/lib/complaints/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { submitSurveyAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints/track/survey"),
    title: UI.cpSurveyTitle[locale],
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function ComplaintSurveyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
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
  if (tracked.complaint.survey !== "open") redirect(status);

  const problem = first((await searchParams).problem);
  const items: ErrorSummaryItem[] =
    problem === "score" ? [{ href: "#score-0", message: UI.cpErrScore[locale] }] : problem === "long" ? [{ href: "#comment", message: UI.cpErrCommentLong[locale] }] : problem ? [{ href: "#score-0", message: UI.cpSurveyFailed[locale] }] : [];

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.cpServiceName[locale], path: "/complaints" },
          { label: UI.cpTrackTitle[locale], path: "/complaints/track" },
          { label: UI.cpSurveyTitle[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        <form action={submitSurveyAction} noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Stack space={6}>
            <Radios
              id="score"
              name="score"
              legend={
                <Heading level={1} className="m-0">
                  {UI.cpSurveyTitle[locale]}
                </Heading>
              }
              hint={UI.cpSurveyHint[locale]}
              error={problem === "score" ? UI.cpErrScore[locale] : undefined}
              options={[
                { value: "5", label: UI.cpScore5[locale] },
                { value: "4", label: UI.cpScore4[locale] },
                { value: "3", label: UI.cpScore3[locale] },
                { value: "2", label: UI.cpScore2[locale] },
                { value: "1", label: UI.cpScore1[locale] },
              ]}
            />
            <Textarea id="comment" name="comment" label={UI.cpCommentLabel[locale]} hint={UI.cpCommentHint[locale]} error={problem === "long" ? UI.cpErrCommentLong[locale] : undefined} rows={4} autoComplete="off" />
            <div>
              <Button type="submit">{UI.cpSurveySend[locale]}</Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
