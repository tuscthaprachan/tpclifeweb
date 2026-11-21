import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ServiceAlert } from "@/components/domain/ServiceAlert";
import { ShuttleRouteTable } from "@/components/domain/shuttle/ShuttleRouteTable";
import { Bus, CarFront, Ship, TrainFront } from "lucide-react";
import { Container, EmptyState, Heading, IconText, Link, Stack, Tag, PageTitle } from "@/components/ui";
import { SOURCE_DOCUMENTS, TRANSPORT } from "@/data/harvested-inventory";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { SourceDocumentLink } from "@/components/domain/open-data/SourceDocumentLink";
import { getOpenDataDocuments } from "@/lib/open-data/read";
import { getActiveServiceAlerts, getActiveShuttleRoutes } from "@/lib/content";
import { alternatesFor } from "@/lib/i18n/metadata";
import { GETTING_AROUND_TEXT } from "./text";

const HEADINGS = {
  shuttle: GETTING_AROUND_TEXT.headingsShuttle,
  mrt: GETTING_AROUND_TEXT.headingsMrt,
  boat: GETTING_AROUND_TEXT.headingsBoat,
  vehicleAccess: GETTING_AROUND_TEXT.headingsVehicleAccess,
};

const NO_TIMETABLE_NOTE = GETTING_AROUND_TEXT.noTimetableNote;

const vehicleAccessDoc = SOURCE_DOCUMENTS.find((doc) => doc.key === "vehicleAccessRules");

interface GettingAroundPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: GettingAroundPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "th";
  return {
    alternates: alternatesFor(locale, "/getting-around"),
    title: UI.gettingAround[locale],
  };
}

/**
 * Real content only. Shuttle route names, the weekday-only service note and
 * the MRT/boat facts below all come from `data/harvested-inventory.ts`,
 * which was harvested from TUSU/TUSC's own published sources. Departure
 * times are deliberately absent from that data: the only published shuttle
 * timetable is an image in an Instagram post, and this page must not invent
 * times to fill the gap. Where a `shuttleRoute` document has been
 * transcribed into the CMS, `ShuttleRouteTable` renders its real timetable;
 * where it has not, this page says so plainly instead of showing nothing or
 * guessing.
 */
export default async function GettingAroundPage({ params }: GettingAroundPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [routes, alerts, documents] = await Promise.all([getActiveShuttleRoutes(), getActiveServiceAlerts(), getOpenDataDocuments()]);
  const trafficAnnouncement = documents.find((doc) => doc.number === "16");

  const relevantAlerts = alerts.filter(
    (alert) => !alert.affects || alert.affects.length === 0 || alert.affects.some((surface) => surface === "shuttle" || surface === "campus" || surface === "sitewide"),
  );

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.gettingAround[locale] }]} />

      <Stack space={12} className="pb-[var(--space-12)]">
        <PageTitle path="/getting-around">{UI.gettingAround[locale]}</PageTitle>

        {relevantAlerts.length > 0 ? (
          <Stack space={3} as="section">
            {relevantAlerts.map((alert) => (
              <ServiceAlert key={alert._id} locale={locale} alert={alert} />
            ))}
          </Stack>
        ) : null}

        {/* Shuttle bus */}
        <Stack space={4} as="section">
          <Heading level={2}>
            <IconText icon={Bus} size={22} className="items-center">
              {pick(HEADINGS.shuttle, locale)}
            </IconText>
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{pick(TRANSPORT.shuttle.note, locale)}</p>

          {routes.length > 0 ? (
            <Stack space={8}>
              {routes.map((route) => (
                <ShuttleRouteTable key={route._id} locale={locale} route={route} headingLevel={3} detailHref={`/${locale}/getting-around/shuttle/${route.slug.current}`} />
              ))}
            </Stack>
          ) : (
            <Stack space={3}>
              <ul className="m-0 flex flex-wrap gap-[var(--space-2)] p-0" style={{ listStyle: "none" }}>
                {TRANSPORT.shuttle.routes.map((route) => (
                  <li key={route.en}>
                    <Tag tone="transport">{pick(route, locale)}</Tag>
                  </li>
                ))}
              </ul>
              <EmptyState title={UI.nothingHere[locale]}>{pick(NO_TIMETABLE_NOTE, locale)}</EmptyState>
            </Stack>
          )}
        </Stack>

        {/* MRT */}
        <Stack space={2} as="section">
          <Heading level={2}>
            <IconText icon={TrainFront} size={22} className="items-center">
              {pick(HEADINGS.mrt, locale)}
            </IconText>
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">
            {pick(TRANSPORT.mrt.line, locale)}, {pick(TRANSPORT.mrt.station, locale)}
          </p>
        </Stack>

        {/* Chao Phraya express boat */}
        <Stack space={2} as="section">
          <Heading level={2}>
            <IconText icon={Ship} size={22} className="items-center">
              {pick(HEADINGS.boat, locale)}
            </IconText>
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{pick(TRANSPORT.boat.note, locale)}</p>
        </Stack>

        {/* Vehicle access rules and fines */}
        {vehicleAccessDoc ? (
          <Stack space={2} as="section">
            <Heading level={2}>
            <IconText icon={CarFront} size={22} className="items-center">
              {pick(HEADINGS.vehicleAccess, locale)}
            </IconText>
          </Heading>
            <p className="m-0">
              <Link href={vehicleAccessDoc.url} locale={locale} className="text-action underline decoration-1 underline-offset-[0.2em]">
                {pick(vehicleAccessDoc.title, locale)}
              </Link>
            </p>
            {trafficAnnouncement ? <SourceDocumentLink locale={locale} document={trafficAnnouncement} /> : null}
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
