import { ServiceAlert } from "@/components/domain/ServiceAlert";
import { ShuttlePanel } from "@/components/domain/shuttle/ShuttlePanel";
import { Heading, Stack } from "@/components/ui";
import { type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace, ServiceAlert as ServiceAlertDoc, ShuttleRoute } from "@/lib/sanity/types";
import { CanteenGlance } from "./CanteenGlance";
import { KeyOpeningHours } from "./KeyOpeningHours";

interface AtAGlanceProps {
  locale: Locale;
  alerts: ServiceAlertDoc[];
  routes: ShuttleRoute[];
  places: CampusPlace[];
  now?: Date;
  /**
   * The canteen line. Omit (or pass null) when there is no canteen data.
   * `closesAt` is the scheduled closing time ("HH:mm") while the canteen is
   * open by its published hours, and null when that is unknown or it is shut.
   */
  canteen?: { closesAt: string | null } | null;
}

/**
 * Section 2, "at a glance": the reason a student comes back daily, so it is
 * dense, text-first and readable without interacting with anything. This is
 * a single stacked list, deliberately not a bento grid of equal tiles
 * (CONTRIBUTING.md, "Avoid bento grids"): a student standing at a stop reads
 * top to bottom, they do not hunt across four equal-weight cards for the one
 * that matters right now.
 *
 * Every route in `ShuttlePanel` is labelled "Scheduled" (`UI.scheduled`),
 * never "live". There is no GPS feed for the Thammasat Tha Prachan shuttle
 * (CONTRIBUTING.md, Honesty), and nothing in this component or its children
 * implies otherwise.
 *
 * `siteSettings` (`lib/sanity/types.ts`) has no field for a standalone
 * "urgent notice": there is no `urgentNotice` or equivalent on
 * `SiteSettings`. A sitewide `ServiceAlert` (`affects` including
 * `"sitewide"`, or simply the highest-severity alert active right now) is
 * the closest editorial equivalent that already exists, and it is what this
 * component renders here. Reported in the home agent's final report as a
 * field that would need adding to the schema rather than invented locally.
 */
export function AtAGlance({ locale, alerts, routes, places, now = new Date(), canteen }: AtAGlanceProps) {
  return (
    <Stack space={6} as="section">
      <Heading level={2}>{UI.atAGlance[locale]}</Heading>

      {alerts.length > 0 ? (
        <Stack space={3} as="ul">
          {alerts.map((alert) => (
            <li key={alert._id}>
              <ServiceAlert locale={locale} alert={alert} />
            </li>
          ))}
        </Stack>
      ) : null}

      <ShuttlePanel locale={locale} routes={routes} headingLevel={3} now={now} />

      <KeyOpeningHours locale={locale} places={places} headingLevel={3} now={now} />

      {canteen ? <CanteenGlance locale={locale} closesAt={canteen.closesAt} /> : null}
    </Stack>
  );
}
