/**
 * The home page, in the order the redesign plan sets (docs/home-redesign-plan.md):
 * a top band with the purpose heading and search, at most one alert banner,
 * Today, Popular, What's on, then the student union and council.
 *
 * Every read goes through `lib/content`'s `safeFetch`-wrapped functions,
 * fetched in parallel with `Promise.all` so one slow or failed read cannot
 * serialise or blank the rest of the page. A database outage yields empty
 * arrays, and every block has its own empty state. The alerts, shuttle,
 * places and weather reads also report whether they failed, so the page can
 * say "unavailable" instead of showing an empty state that looks like good news.
 *
 * The alerts and shuttle reads are cached for a minute and invalidated by tag
 * when an alert or route changes (lib/content/cache.ts).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/domain/activity";
import { PopularTasks, TodayList, WHATS_ON_NEWS, WhatsOn, isLibrary, splitAlerts } from "@/components/domain/home";
import { SearchBar } from "@/components/domain/search/SearchBar";
import { ServiceAlert } from "@/components/domain/ServiceAlert";
import { HeroPurpose } from "@/components/domain/home/HeroPurpose";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Dome } from "@/components/illustrations/Dome";
import { Container, Heading, WarningText } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCampusWeather } from "@/lib/weather/read";
import {
  getActiveServiceAlertsResult,
  getActiveShuttleRoutesResult,
  getKeyPlacesResult,
  getNewsPage,
  getPlacesResult,
  getPolicies,
  getTodaySettings,
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

  const [alertsRead, routesRead, keyPlacesRead, allPlacesRead, events, newsPage, policies, weatherRead, todaySettings] = await Promise.all([
    getActiveServiceAlertsResult(),
    getActiveShuttleRoutesResult(),
    getKeyPlacesResult(),
    getPlacesResult(),
    getUpcomingEvents(),
    getNewsPage(1, NEWS_FETCH_COUNT),
    getPolicies(),
    getCampusWeather(),
    getTodaySettings(),
  ]);

  const alerts = alertsRead.data;
  const routes = routesRead.data;
  const keyPlaces = keyPlacesRead.data;
  const allPlaces = allPlacesRead.data;
  const weather = weatherRead;
  const unavailable = {
    shuttle: !routesRead.ok,
    hours: !keyPlacesRead.ok || !allPlacesRead.ok,
    weather: !weather.heat && !weather.pm25,
  };

  const { banner, rows: alertRows } = splitAlerts(alerts);
  const libraries = allPlaces.filter(isLibrary);
  const otherKeyPlaces = keyPlaces.filter((place) => !isLibrary(place));
  const shownNewsIds = newsPage.items.slice(0, WHATS_ON_NEWS).map((post) => post._id);

  return (
    <>
      <div className="rounded-b-[var(--radius-band)]" style={{ background: "var(--band-gradient)" }}>
        <Container className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[var(--space-4)] pb-[var(--space-5)] pt-[var(--space-4)] sm:items-end sm:gap-x-[var(--space-12)] sm:pb-0 sm:pt-[var(--space-8)]">
          <div className="contents sm:col-start-1 sm:row-start-1 sm:block sm:self-center sm:pb-[var(--space-8)]">
            <Heading level={1} className={`col-start-1 row-start-1 m-0 max-w-[12em] self-center ${locale === "th" ? "text-[length:clamp(2.5rem,20vw_-_1.375rem,3.75rem)] font-normal [font-family:var(--font-chanok),var(--font-th)] sm:text-[length:clamp(4rem,1.75rem_+_5.4vw,6rem)]" : "text-[length:clamp(1.5rem,0.75rem_+_3.5vw,2.25rem)] font-bold sm:text-[length:clamp(2.25rem,0.75rem_+_3.6vw,3.75rem)]"}`}>
              {UI.homeHeading[locale]}
            </Heading>
            <div className="col-span-2 row-start-2 sm:col-span-1">
              <HeroPurpose locale={locale} />
            </div>
            <SearchBar
              locale={locale}
              label={UI.homeSearchLabel[locale]}
              examples={[
                UI.homeSearchExample1[locale],
                UI.homeSearchExample2[locale],
                UI.homeSearchExample3[locale],
                UI.homeSearchExample4[locale],
                UI.homeSearchExample5[locale],
                UI.homeSearchExample6[locale],
              ]}
              variant="pill"
              className="relative col-span-2 row-start-3 mt-[var(--space-3)] sm:mt-[var(--space-6)] sm:max-w-[40rem]"
            />
          </div>
          <Dome className="pointer-events-none col-start-2 row-start-1 -mt-2 w-24 self-end [mask-image:linear-gradient(to_bottom,#000_90%,transparent)] sm:my-0 sm:w-[170px] md:w-[220px] lg:w-[260px]" />
        </Container>
      </div>

      <Container className="flex flex-col gap-[var(--space-6)] pb-[var(--space-8)] pt-[var(--space-5)]">
        {!alertsRead.ok ? (
          <WarningText>
            <span className="visually-hidden">{UI.warning[locale]}: </span>
            {UI.htdAlertsUnavailable[locale]}
          </WarningText>
        ) : banner ? (
          <ServiceAlert locale={locale} alert={banner} announce={false} compact now={now} />
        ) : null}

        <div className="grid items-start gap-[var(--space-6)] sm:grid-cols-2 sm:gap-x-[var(--space-8)]">
          <TodayList locale={locale} alerts={alertRows} routes={routes} places={otherKeyPlaces} libraries={libraries} weather={weather} settings={todaySettings} now={now} unavailable={unavailable} />
          <div className="order-first sm:order-none">
            <PopularTasks locale={locale} tasks={settings.homeTasks} />
          </div>
        </div>

        <div className="grid items-start gap-[var(--space-6)] sm:grid-cols-2 sm:gap-x-[var(--space-8)]">
          <WhatsOn locale={locale} events={events} news={newsPage.items} />
          <ActivityFeed locale={locale} news={newsPage.items} policies={policies} excludeNewsIds={shownNewsIds} />
        </div>
      </Container>
    </>
  );
}
