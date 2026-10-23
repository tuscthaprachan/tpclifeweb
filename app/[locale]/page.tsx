/**
 * The home page. Composed in the fixed order the product brief specifies:
 *
 *   1. Search, the largest and most prominent element on the page.
 *   2. At-a-glance live information: shuttle, service alerts, key opening
 *      hours. Dense, text-first, no interaction required.
 *   3. Upcoming events, then recent news, each capped with a link to its
 *      full listing.
 *   4. The centralised form system: priority forms, then a route to the
 *      full index.
 *   5. TUSU and TUSC activity, attributed, plus the route into the policy
 *      dashboard.
 *
 * Every read goes through `lib/content`'s `safeFetch`-wrapped functions,
 * fetched in parallel with `Promise.all` so one slow or failed read cannot
 * serialise or blank the rest of the page. A database outage yields empty
 * arrays, and every section below has its own well-designed empty state,
 * because an all-empty page is a real state of this page, not a hypothetical.
 *
 * The alerts and shuttle reads, the surfaces that most need to feel current,
 * are cached for a minute and invalidated by tag when an alert or route
 * changes (lib/content/cache.ts), which keeps them current without giving
 * up the outage resilience CONTRIBUTING.md and this page's brief treat as
 * non-negotiable.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/domain/activity";
import { AtAGlance, EventsAndNews, PriorityForms } from "@/components/domain/home";
import { SearchBar } from "@/components/domain/search/SearchBar";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Container, Heading, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { closesAt as canteenClosesAt } from "@/lib/canteen/derive";
import {
  getCanteenData,
  getActiveServiceAlerts,
  getActiveShuttleRoutes,
  getKeyPlaces,
  getNewsPage,
  getPolicies,
  getPriorityForms,
  getUpcomingEvents,
} from "@/lib/content";

// Fetched a little wider than the 3 shown in section 3, so filtering section
// 5's activity feed down to TUSU/TUSC ownership still has something to draw
// from without a second round trip to the CMS.
const NEWS_FETCH_COUNT = 8;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const settings = await getSiteSettings();
  const name = pick(settings.serviceName, locale);
  const description = pick(settings.tagline, locale);

  return {
    alternates: alternatesFor(locale, "/"),
    // `absolute` bypasses the root layout's `%s | ${name}` title template:
    // the home page's title IS the service name, not "name | name".
    title: { absolute: name },
    description,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const settings = await getSiteSettings();

  const [alerts, routes, keyPlaces, events, newsPage, priorityForms, policies, canteenData] = await Promise.all([
    getActiveServiceAlerts(),
    getActiveShuttleRoutes(),
    getKeyPlaces(),
    getUpcomingEvents(),
    getNewsPage(1, NEWS_FETCH_COUNT),
    getPriorityForms(),
    getPolicies(),
    getCanteenData(),
  ]);
  // The canteen line only appears once the canteen has been surveyed. The
  // closing time is the scheduled one, and is left out when it is unknown.
  const canteen =
    canteenData.dishes.length > 0 ? { closesAt: canteenClosesAt(canteenData.settings, undefined, new Date()) } : null;

  return (
    <Container>
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        {/* 1. Search: the largest, most prominent element on the page. */}
        <Stack space={4} as="section">
          <Heading level={1} className="text-4xl">{pick(settings.serviceName, locale)}</Heading>
          <p className="m-0 max-w-prose text-lg text-ink-600">{pick(settings.tagline, locale)}</p>
          <SearchBar locale={locale} className="mt-[var(--space-2)]" />
        </Stack>

        {/* 2. At-a-glance live information. */}
        <AtAGlance locale={locale} alerts={alerts} routes={routes} places={keyPlaces} canteen={canteen} />

        {/* 3. Events and news. */}
        <EventsAndNews locale={locale} events={events} news={newsPage.items} />

        {/* 4. The centralised form system. */}
        <PriorityForms locale={locale} forms={priorityForms} />

        {/* 5. TUSU and TUSC activity. */}
        <ActivityFeed locale={locale} news={newsPage.items} policies={policies} />
      </Stack>
    </Container>
  );
}
