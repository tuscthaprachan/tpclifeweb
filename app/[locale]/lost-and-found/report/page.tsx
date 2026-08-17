/**
 * The public report form. A Server Component shell around the actual form
 * (ReportForm.tsx, a Client Component only because useActionState needs one):
 * this file does the two things that must happen before any HTML reaches the
 * reader, checking whether reports can be accepted at all, and fetching the
 * place list for the location field.
 *
 * Rendered fresh on every request (`dynamic = "force-dynamic"`), not
 * prerendered: the hidden `renderedAt` timestamp ReportForm submits back is
 * the anti-spam minimum-time-on-page check, and a value baked in at build
 * time would make that check meaningless for every visitor after the build.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportForm } from "./ReportForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, NotificationBanner, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import { getPlaces } from "@/lib/sanity/queries";
import { writeToken } from "@/lib/sanity/env";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/lost-and-found/report"),
    title: `${UI.reportLostItem[locale]} / ${UI.reportFoundItem[locale]}`,
  };
}

export default async function LostFoundReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const rawKind = firstParam(query.kind);
  const initialKind = rawKind === "found" ? "found" : "lost";

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: UI.lostAndFound[locale], path: "/lost-and-found" },
        { label: initialKind === "found" ? UI.reportFoundItem[locale] : UI.reportLostItem[locale] },
      ]}
    />
  );

  // writeToken empty means Sanity writes are not configured in this
  // environment. Say so honestly (lib/sanity/env.ts's own comment: "the
  // submission action checks it and tells the student the form is
  // unavailable rather than accepting a report it cannot store") rather than
  // rendering a form that can never succeed. The sitewide help block still
  // renders from the root layout regardless, so contact details stay reachable.
  if (!writeToken) {
    return (
      <Container width="narrow">
        {breadcrumbs}
        <Stack space={4} className="py-[var(--space-8)]">
          <Heading level={1}>{initialKind === "found" ? UI.reportFoundItem[locale] : UI.reportLostItem[locale]}</Heading>
          <NotificationBanner variant="warning" title={UI.serviceUnavailableTitle[locale]}>
            {UI.reportUnavailable[locale]}
          </NotificationBanner>
        </Stack>
      </Container>
    );
  }

  const places = await getPlaces();

  return (
    <Container width="narrow">
      {breadcrumbs}
      <Stack space={6} className="py-[var(--space-8)]">
        <Stack space={2}>
          <Heading level={1}>{initialKind === "found" ? UI.reportFoundItem[locale] : UI.reportLostItem[locale]}</Heading>
          <p className="m-0 text-ink-600">{UI.reportLostFoundIntro[locale]}</p>
        </Stack>
        <ReportForm locale={locale} initialKind={initialKind} places={places} renderedAt={new Date().toISOString()} />
      </Stack>
    </Container>
  );
}
