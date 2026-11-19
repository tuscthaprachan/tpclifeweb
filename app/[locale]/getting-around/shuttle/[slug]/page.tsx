import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShuttleNow } from "@/components/domain/shuttle/ShuttleNow";
import { ShuttleRouteTable } from "@/components/domain/shuttle/ShuttleRouteTable";
import { AlertLinks, alertsAffecting, formatDateKey, formatDateRange, formatDays } from "@/components/domain/today";
import { fillText } from "@/components/domain/open-data/fill";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, Stack, SummaryList, Tag, Timestamp } from "@/components/ui";
import { getActiveServiceAlerts, getActiveShuttleRoutes } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { addDaysToDateKey } from "@/lib/shuttle/schedule";

export const dynamic = "force-dynamic";

const EXCEPTION_HORIZON_DAYS = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

async function findRoute(slug: string) {
  const routes = await getActiveShuttleRoutes();
  return { route: routes.find((r) => r.slug.current === slug), others: routes.filter((r) => r.slug.current !== slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { route } = await findRoute(slug);
  if (!route) return {};
  return {
    alternates: alternatesFor(locale, `/getting-around/shuttle/${slug}`),
    title: pick(route.name, locale),
    description: route.description ? pick(route.description, locale) : undefined,
  };
}

/**
 * One shuttle route in full: the next departures, today's timetable with
 * what has left muted, the stops, when it runs and the exceptions coming up,
 * the fare and where the timetable comes from. Scheduled, never live.
 */
export default async function ShuttleRoutePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [{ route, others }, alerts] = await Promise.all([findRoute(slug), getActiveServiceAlerts()]);
  if (!route) notFound();

  const now = new Date();
  const today = bangkokDateKey(now);
  const horizon = addDaysToDateKey(today, EXCEPTION_HORIZON_DAYS);
  const within = (date: string) => date >= today && date <= horizon;
  const excluded = (route.calendar.excludedDates ?? []).filter(within).sort();
  const added = (route.calendar.addedDates ?? []).filter(within).sort();
  const related = alertsAffecting(alerts, "shuttle");
  const { calendar } = route;

  const serviceRows = [
    { key: UI.tdShuttleRunsOn[locale], value: formatDays(calendar.daysOfWeek, locale) },
    ...(calendar.validFrom || calendar.validUntil ? [{ key: UI.tdShuttleValid[locale], value: formatDateRange(calendar.validFrom, calendar.validUntil, locale) }] : []),
    ...(excluded.length > 0
      ? [{ key: UI.tdShuttleNoServiceOn[locale], value: <DateList locale={locale} dates={excluded} /> }]
      : []),
    ...(added.length > 0 ? [{ key: UI.tdShuttleExtraOn[locale], value: <DateList locale={locale} dates={added} /> }] : []),
    ...(route.fare ? [{ key: UI.tdShuttleFare[locale], value: pick(route.fare, locale) }] : []),
  ];

  return (
    <Container>
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: UI.gettingAround[locale], path: "/getting-around" }, { label: pick(route.name, locale) }]}
      />

      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <Heading level={1} className="m-0">
            {pick(route.name, locale)}
          </Heading>
          {route.description ? <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{pick(route.description, locale)}</p> : null}
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <Tag tone="transport">{UI.scheduled[locale]}</Tag>
            <span className="text-sm text-ink-600">{UI.scheduledExplainer[locale]}</span>
          </div>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.tdShuttleNow[locale]}</Heading>
          <ShuttleNow locale={locale} route={route} serverNowIso={now.toISOString()} />
        </Stack>

        {related.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdRelatedAlerts[locale]}</Heading>
            <AlertLinks locale={locale} alerts={related} />
          </Stack>
        ) : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.tdShuttleTimetable[locale]}</Heading>
          <ShuttleRouteTable locale={locale} route={route} headingLevel={3} now={now} markDeparted tableOnly />
        </Stack>

        {route.stops.length > 0 ? (
          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdShuttleStops[locale]}</Heading>
            <ol className="m-0 flex flex-col gap-[var(--space-2)] ps-[var(--space-6)]">
              {route.stops.map((stop, index) => (
                <li key={stop._key}>
                  <strong>{pick(stop.name, locale)}</strong>
                  <span className="text-ink-600">
                    {" "}
                    {index === 0 ? `(${UI.tdShuttleOrigin[locale]})` : stop.offsetMinutes > 0 ? `(${fillText(UI.tdShuttleStopAt[locale], { n: stop.offsetMinutes })})` : null}
                  </span>
                  {stop.note ? <span className="block text-ink-600">{pick(stop.note, locale)}</span> : null}
                </li>
              ))}
            </ol>
          </Stack>
        ) : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.tdShuttleServiceDays[locale]}</Heading>
          <SummaryList rows={serviceRows} />
        </Stack>

        {route.notes ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdShuttleNotes[locale]}</Heading>
            <p className="m-0 max-w-[var(--measure-en)] whitespace-pre-line">{pick(route.notes, locale)}</p>
          </Stack>
        ) : null}

        {route.sourceNote || route.lastVerified ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdShuttleSource[locale]}</Heading>
            {route.sourceNote ? <p className="m-0 max-w-[var(--measure-en)]">{pick(route.sourceNote, locale)}</p> : null}
            {route.lastVerified ? (
              <p className="m-0 text-sm text-ink-600">
                {UI.tdShuttleLastChecked[locale]} <Timestamp value={`${route.lastVerified.slice(0, 10)}T12:00:00+07:00`} locale={locale} />
              </p>
            ) : null}
          </Stack>
        ) : null}

        <Stack space={2} as="section">
          <Heading level={2}>{UI.tdShuttleOtherRoutes[locale]}</Heading>
          <ul className="m-0 flex flex-col gap-[var(--space-2)] ps-[var(--space-6)]">
            {others.map((other) => (
              <li key={other._id}>
                <Link href={`/${locale}/getting-around/shuttle/${other.slug.current}`} locale={locale}>
                  {pick(other.name, locale)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${locale}/getting-around`} locale={locale}>
                {UI.gettingAround[locale]}
              </Link>
            </li>
          </ul>
        </Stack>
      </Stack>
    </Container>
  );
}

function DateList({ locale, dates }: { locale: Locale; dates: string[] }) {
  return (
    <ul className="m-0 p-0" style={{ listStyle: "none" }}>
      {dates.map((date) => (
        <li key={date}>{formatDateKey(date, locale)}</li>
      ))}
    </ul>
  );
}
