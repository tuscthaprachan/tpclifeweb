/**
 * The home page, in the order the redesign plan sets (docs/home-redesign-plan.md):
 * a top band with the purpose heading and search, at most one alert banner,
 * Today, Popular, What's on, then the student union and council.
 *
 * Every read goes through `lib/content`'s `safeFetch`-wrapped functions,
 * fetched in parallel with `Promise.all` so one slow or failed read cannot
 * serialise or blank the rest of the page. A database outage yields empty
 * arrays, and every block has its own empty state.
 *
 * The alerts and shuttle reads are cached for a minute and invalidated by tag
 * when an alert or route changes (lib/content/cache.ts).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/domain/activity";
import { PopularTasks, TodayList, WHATS_ON_NEWS, WhatsOn, splitAlerts } from "@/components/domain/home";
import { SearchBar } from "@/components/domain/search/SearchBar";
import { ServiceAlert } from "@/components/domain/ServiceAlert";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Dome } from "@/components/illustrations/Dome";
import { Container, Heading } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { closesAt as canteenClosesAt } from "@/lib/canteen/derive";
import {
  getCanteenData,
  getActiveServiceAlerts,
  getActiveShuttleRoutes,
  getKeyPlaces,
  getNewsPage,
  getPolicies,
  getUpcomingEvents,
} from "@/lib/content";

// The shown news plus a few more, so the union block can still find TUSU and
// TUSC posts that are not already in What's on.
const NEWS_FETCH_COUNT = 6;

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

  const now = new Date();
  const settings = await getSiteSettings();

  const [alerts, routes, keyPlaces, events, newsPage, policies, canteenData] = await Promise.all([
    getActiveServiceAlerts(),
    getActiveShuttleRoutes(),
    getKeyPlaces(),
    getUpcomingEvents(),
    getNewsPage(1, NEWS_FETCH_COUNT),
    getPolicies(),
    getCanteenData(),
  ]);

  // The canteen row only appears once the canteen has been surveyed. The
  // closing time is the scheduled one, and is left out when it is unknown.
  const canteen =
    canteenData.dishes.length > 0 ? { closesAt: canteenClosesAt(canteenData.settings, undefined, now) } : null;

  const { banner, rows: alertRows } = splitAlerts(alerts);
  const shownNewsIds = newsPage.items.slice(0, WHATS_ON_NEWS).map((post) => post._id);

  return (
    <>
      <div className="rounded-b-[var(--radius-band)]" style={{ background: "var(--band-gradient)" }}>
        <Container className="pb-[var(--space-5)] pt-[var(--space-4)]">
          <div className="flex items-start justify-between gap-[var(--space-2)]">
            <Heading level={1} className="m-0 max-w-[12em] text-[length:var(--text-2xl)] font-bold">
              {UI.homeHeading[locale]}
            </Heading>
            <Dome className="pointer-events-none -mb-12 -mt-2 w-24 flex-none sm:-mb-[60px] sm:w-[180px]" />
          </div>
          <SearchBar
            locale={locale}
            label={UI.homeSearchLabel[locale]}
            hint={UI.homeSearchHint[locale]}
            variant="pill"
            className="relative mt-[var(--space-2)]"
          />
        </Container>
      </div>

      <Container className="flex flex-col gap-[var(--space-6)] pb-[var(--space-8)] pt-[var(--space-5)]">
        {banner ? <ServiceAlert locale={locale} alert={banner} announce={false} /> : null}

        <div className="grid items-start gap-[var(--space-6)] sm:grid-cols-2 sm:gap-x-[var(--space-8)]">
          <TodayList locale={locale} alerts={alertRows} routes={routes} places={keyPlaces} canteen={canteen} now={now} />
          <PopularTasks locale={locale} tasks={settings.homeTasks} />
        </div>

        <div className="grid items-start gap-[var(--space-6)] sm:grid-cols-2 sm:gap-x-[var(--space-8)]">
          <WhatsOn locale={locale} events={events} news={newsPage.items} />
          <ActivityFeed locale={locale} news={newsPage.items} policies={policies} excludeNewsIds={shownNewsIds} />
        </div>
      </Container>
    </>
  );
}
