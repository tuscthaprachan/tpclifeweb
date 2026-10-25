import NextLink from "next/link";

import { EAT, eat, t } from "@/components/domain/canteen/strings";
import { ShuttleTodayRows } from "@/components/domain/shuttle/ShuttleTodayRows";
import { Link as UiLink, StatusTag, type StatusTone } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { AlertSeverity, CampusPlace, ServiceAlert, ShuttleRoute } from "@/lib/content/types";
import { getPlaceHoursStatus, type PlaceHoursStatus } from "./openingHours";
import { SectionBar } from "./SectionBar";
import { TODAY_LINK_CLASS, TodayRow } from "./TodayRow";

const HEADING_ID = "home-today-heading";

const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = { info: "info", warning: "warning", critical: "error" };
const SEVERITY_LABEL: Record<AlertSeverity, UiKey> = {
  info: "alertSeverityInfo",
  warning: "alertSeverityWarning",
  critical: "alertSeverityCritical",
};

interface TodayListProps {
  locale: Locale;
  alerts: ServiceAlert[];
  routes: ShuttleRoute[];
  places: CampusPlace[];
  canteen: { closesAt: string | null } | null;
  now: Date;
}

export function TodayList({ locale, alerts, routes, places, canteen, now }: TodayListProps) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="transport">
        {UI.homeToday[locale]}
      </SectionBar>

      <dl className="m-0 mt-[var(--space-2)]">
        <ShuttleTodayRows locale={locale} routes={routes} now={now} />

        {alerts.map((alert) => (
          <TodayRow
            key={alert._id}
            title={
              alert.moreInfoUrl ? (
                <UiLink href={alert.moreInfoUrl} locale={locale} className={TODAY_LINK_CLASS}>
                  {pick(alert.title, locale)}
                </UiLink>
              ) : (
                pick(alert.title, locale)
              )
            }
            status={<StatusTag tone={SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />}
          >
            <span>{pick(alert.body, locale)}</span>
          </TodayRow>
        ))}

        {places.length === 0 ? (
          <TodayRow title={UI.keyHoursTitle[locale]}>
            <span>{UI.keyHoursNotPublished[locale]}</span>
          </TodayRow>
        ) : (
          places.map((place) => (
            <PlaceRow
              key={place._id}
              locale={locale}
              place={place}
              status={place.closureNote ? { kind: "closed", note: place.closureNote } : getPlaceHoursStatus(place, now)}
            />
          ))
        )}

        {canteen ? (
          <TodayRow
            title={
              <NextLink href={localePath(locale, "/eat")} className={TODAY_LINK_CLASS}>
                {t(EAT.title, locale)}
              </NextLink>
            }
            status={canteen.closesAt ? <StatusTag tone="success" label={UI.openNow[locale]} /> : undefined}
          >
            {canteen.closesAt ? <span>{eat.openUntil(locale, canteen.closesAt)}</span> : null}
            <NextLink href={localePath(locale, "/eat/pick")} className="font-semibold">
              {t(EAT.decideButton, locale)}
            </NextLink>
          </TodayRow>
        ) : null}
      </dl>

      <p className="mb-0 mt-[var(--space-3)] text-[length:var(--text-sm)] text-ink-600">{UI.scheduledExplainer[locale]}</p>
      <NextLink
        href={localePath(locale, "/getting-around")}
        className="inline-flex min-h-[var(--target-min)] items-center font-semibold"
      >
        {UI.homeFullTimetable[locale]}
      </NextLink>
    </section>
  );
}

function PlaceRow({ locale, place, status }: { locale: Locale; place: CampusPlace; status: PlaceHoursStatus }) {
  const title = (
    <NextLink href={localePath(locale, "/directory")} className={TODAY_LINK_CLASS}>
      {pick(place.name, locale)}
    </NextLink>
  );

  switch (status.kind) {
    case "open":
      return (
        <TodayRow title={title} status={<StatusTag tone="success" label={UI.openNow[locale]} />}>
          <span>
            {UI.closesAt[locale]} {status.closes}
          </span>
          {status.note ? <span>{pick(status.note, locale)}</span> : null}
        </TodayRow>
      );
    case "closed":
      return (
        <TodayRow title={title} status={<StatusTag tone="neutral" label={UI.closedNow[locale]} />}>
          {status.opensNext ? (
            <span>
              {UI.opensAt[locale]} {status.opensNext}
            </span>
          ) : null}
          {status.note ? <span>{pick(status.note, locale)}</span> : null}
        </TodayRow>
      );
    case "noHours":
      return (
        <TodayRow title={title}>
          <span>{UI.keyHoursNotPublished[locale]}</span>
        </TodayRow>
      );
  }
}
