import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpeningHoursBoard } from "@/components/domain/today";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Stack, PageTitle } from "@/components/ui";
import { getPlaces } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return { alternates: alternatesFor(locale, "/places"), title: UI.tdPlaces[locale], description: UI.tdPlacesIntro[locale] };
}

export default async function PlacesPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;
  const openOnly = query.open === "1";

  const places = await getPlaces();
  const now = new Date();

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdPlaces[locale] }]} />
      <Stack space={6} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <PageTitle path="/places" className="m-0">
            {UI.tdPlaces[locale]}
          </PageTitle>
          <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{UI.tdPlacesIntro[locale]}</p>
        </Stack>

        {places.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]}>{UI.keyHoursNotPublished[locale]}</EmptyState>
        ) : (
          <OpeningHoursBoard locale={locale} places={places} now={now} openOnly={openOnly} basePath="/places" />
        )}
      </Stack>
    </Container>
  );
}
