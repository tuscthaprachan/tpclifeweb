import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventCard } from "@/components/domain/event";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Grid, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getUpcomingEvents } from "@/lib/sanity/queries";
import { alternatesFor } from "@/lib/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/events"), title: UI.upcomingEvents[locale] };
}

export default async function EventsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const events = await getUpcomingEvents();

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.events[locale] }]} />
      <Stack space={8} className="py-[var(--space-8)]">
        <Heading level={1}>{UI.upcomingEvents[locale]}</Heading>

        {events.length === 0 ? (
          <EmptyState title={UI.noUpcomingEvents[locale]} />
        ) : (
          <Grid minColumnWidth="18rem">
            {events.map((event) => (
              <EventCard key={event._id} event={event} locale={locale} headingLevel={2} />
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
