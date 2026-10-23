import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ServiceAlert } from "@/components/domain/ServiceAlert";
import { ShuttleRouteTable } from "@/components/domain/shuttle/ShuttleRouteTable";
import { Container, EmptyState, Heading, Link, Stack, Tag } from "@/components/ui";
import { SOURCE_DOCUMENTS, TRANSPORT } from "@/data/harvested-inventory";
import { isLocale, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getActiveServiceAlerts, getActiveShuttleRoutes } from "@/lib/content";
import { alternatesFor } from "@/lib/i18n/metadata";

/*
 * TODO: add to UI strings. This page's section headings have no shared
 * entries in lib/i18n/strings.ts: only the umbrella `gettingAround` label
 * exists, not "shuttle bus", "MRT" or "vehicle access rules". Using local
 * literals until strings.ts gets them; reported in the shuttle agent's final
 * report.
 */
const HEADINGS = {
  shuttle: { th: "รถรับส่งธรรมศาสตร์ท่าพระจันทร์", en: "TPC shuttle bus" },
  mrt: { th: "รถไฟฟ้า MRT", en: "MRT" },
  boat: { th: "เรือด่วนเจ้าพระยา", en: "Chao Phraya express boat" },
  vehicleAccess: { th: "หลักเกณฑ์รถเข้า-ออกและค่าปรับ", en: "Vehicle access rules and fines" },
} as const satisfies Record<string, LocaleString>;

// Same gap as components/domain/shuttle/ShuttlePanel.tsx and ShuttleRouteTable.tsx.
const NO_TIMETABLE_NOTE: LocaleString = {
  th: "ยังไม่มีการเผยแพร่ตารางเวลาสำหรับเส้นทางนี้ ทีมงานกำลังตรวจสอบตารางเวลาที่ประกาศไว้",
  en: "A timetable for this route has not been published yet. The published schedule is being confirmed",
};

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

  const [routes, alerts] = await Promise.all([getActiveShuttleRoutes(), getActiveServiceAlerts()]);

  const relevantAlerts = alerts.filter(
    (alert) => !alert.affects || alert.affects.length === 0 || alert.affects.some((surface) => surface === "shuttle" || surface === "campus" || surface === "sitewide"),
  );

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.gettingAround[locale] }]} />

      <Stack space={12} className="pb-[var(--space-12)]">
        <Heading level={1}>{UI.gettingAround[locale]}</Heading>

        {relevantAlerts.length > 0 ? (
          <Stack space={3} as="section">
            {relevantAlerts.map((alert) => (
              <ServiceAlert key={alert._id} locale={locale} alert={alert} />
            ))}
          </Stack>
        ) : null}

        {/* Shuttle bus */}
        <Stack space={4} as="section">
          <Heading level={2}>{pick(HEADINGS.shuttle, locale)}</Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{pick(TRANSPORT.shuttle.note, locale)}</p>

          {routes.length > 0 ? (
            <Stack space={8}>
              {routes.map((route) => (
                <ShuttleRouteTable key={route._id} locale={locale} route={route} headingLevel={3} />
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
          <Heading level={2}>{pick(HEADINGS.mrt, locale)}</Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">
            {pick(TRANSPORT.mrt.line, locale)}, {pick(TRANSPORT.mrt.station, locale)}
          </p>
        </Stack>

        {/* Chao Phraya express boat */}
        <Stack space={2} as="section">
          <Heading level={2}>{pick(HEADINGS.boat, locale)}</Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{pick(TRANSPORT.boat.note, locale)}</p>
        </Stack>

        {/* Vehicle access rules and fines */}
        {vehicleAccessDoc ? (
          <Stack space={2} as="section">
            <Heading level={2}>{pick(HEADINGS.vehicleAccess, locale)}</Heading>
            <p className="m-0">
              <Link href={vehicleAccessDoc.url} locale={locale} className="text-action underline decoration-1 underline-offset-[0.2em]">
                {pick(vehicleAccessDoc.title, locale)}
              </Link>
            </p>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
