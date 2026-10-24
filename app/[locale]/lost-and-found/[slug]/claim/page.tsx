/**
 * Start page for claiming a found item ("This is mine"). A listing backed by
 * a case starts the short claim journey. A legacy listing with no case shows
 * its claim contact instead, and one that can no longer be claimed says so.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LostFoundClaimContact } from "@/components/domain/lostfound";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { StartPage } from "../../_journey/StartPage";
import { getLostFoundItemBySlug } from "@/lib/content";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { claimStateFor } from "@/lib/lost-found/public/listing";
import { Unavailable } from "../../_journey/Unavailable";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, `/lost-and-found/${slug}/claim`),
    title: UI.lfpClaimTitle[locale],
    robots: { index: false, follow: false },
  };
}

export default async function ClaimStartPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;

  if (!isDatabaseConfigured()) return <Unavailable locale={locale} title={UI.lfpClaimTitle[locale]} />;
  const item = await getLostFoundItemBySlug(slug);
  if (!item || item.kind !== "found") notFound();
  const state = await claimStateFor(slug);
  if (state.state === "missing") notFound();

  const title = pick(item.title, locale);
  const crumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: UI.lostAndFound[locale], path: "/lost-and-found" },
        { label: title, path: `/lost-and-found/${slug}` },
        { label: UI.lfpClaimTitle[locale] },
      ]}
    />
  );

  if (state.state === "legacy" || state.state === "closed") {
    return (
      <Container width="narrow">
        {crumbs}
        <Stack space={4} className="pb-[var(--space-8)] pt-[var(--space-2)]">
          <Heading level={1}>{UI.lfpClaimTitle[locale]}</Heading>
          <p className="m-0 text-ink-900">
            {title} ({UI.lostFoundReference[locale]}: {item.reference})
          </p>
          {state.state === "legacy" ? (
            <>
              <InsetText>{UI.lfpClaimLegacy[locale]}</InsetText>
              {item.claimContact ? <LostFoundClaimContact contact={item.claimContact} locale={locale} /> : null}
            </>
          ) : (
            <NotificationBanner variant="info" title={UI.lfpClaimTitle[locale]}>
              {UI.lfpClaimClosed[locale]}
            </NotificationBanner>
          )}
        </Stack>
      </Container>
    );
  }

  return (
    <StartPage
      kind="claim"
      locale={locale}
      slug={slug}
      intro={UI.lfpClaimIntro[locale]}
      subject={
        <p className="m-0 text-ink-900">
          <span className="font-medium">{UI.lfpRowItem[locale]}:</span> {title} ({UI.lostFoundReference[locale]}: {item.reference})
        </p>
      }
      need={[UI.lfpClaimNeed1[locale], UI.lfpClaimNeed2[locale]]}
      expired={first(query.expired) === "1"}
      problem={first(query.problem) === "1"}
    />
  );
}
