import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fillText } from "@/components/domain/open-data/fill";
import { isLibrary, summariseLibraries } from "@/components/domain/home";
import { AlertLinks, PlacesTable, alertsAffecting } from "@/components/domain/today";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Link, Stack, StatusTag } from "@/components/ui";
import { getActiveServiceAlerts, getPlaces, getTodaySettings } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return { alternates: alternatesFor(locale, "/places/libraries"), title: UI.homeLibraries[locale], description: UI.tdLibrariesIntro[locale] };
}

/** Every library side by side, so "which one is open, and till when" is one glance down a column. */
export default async function LibrariesPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [places, alerts, settings] = await Promise.all([getPlaces(), getActiveServiceAlerts(), getTodaySettings()]);
  const now = new Date();
  const libraries = places.filter(isLibrary);
  const summary = summariseLibraries(libraries, now);
  const related = alertsAffecting(alerts, "campus");
  const guide = settings.librariesGuidePath;

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdPlaces[locale], path: "/places" }, { label: UI.homeLibraries[locale] }]} />

      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <Heading level={1} className="m-0">
            {UI.homeLibraries[locale]}
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{settings.librariesIntro ? pick(settings.librariesIntro, locale) : UI.tdLibrariesIntro[locale]}</p>
          {summary.total > 0 ? (
            <div>
              {summary.open > 0 ? (
                <StatusTag tone="success" label={fillText(UI.homeLibrariesOpen[locale], { open: summary.open, total: summary.total })} />
              ) : (
                <StatusTag tone="neutral" label={UI.homeLibrariesAllClosed[locale]} />
              )}
            </div>
          ) : null}
        </Stack>

        {related.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdRelatedAlerts[locale]}</Heading>
            <AlertLinks locale={locale} alerts={related} />
          </Stack>
        ) : null}

        {libraries.length > 0 ? (
          <PlacesTable locale={locale} places={libraries} now={now} caption={UI.tdLibrariesCaption[locale]} />
        ) : (
          <EmptyState title={UI.nothingHere[locale]}>{UI.tdLibrariesNone[locale]}</EmptyState>
        )}

        {guide ? (
          <p className="m-0">
            <Link href={guide.startsWith("/") ? `/${locale}${guide}` : guide} locale={locale} className="font-semibold">
              {UI.tdLibrariesGuide[locale]}
            </Link>
          </p>
        ) : null}
      </Stack>
    </Container>
  );
}
