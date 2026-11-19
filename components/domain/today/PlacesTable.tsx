import NextLink from "next/link";
import { DataTable } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace } from "@/lib/content/types";
import { PlaceStatusTag, placeStatus, placeStatusLine, todayHoursText } from "./PlaceHours";

/** Places side by side: name (a link to the place), open now, until or from when, and today's hours. */
export function PlacesTable({ locale, places, now, caption }: { locale: Locale; places: CampusPlace[]; now: Date; caption: string }) {
  const rows = places.map((place) => ({ place, status: placeStatus(place, now) }));
  const hasBuilding = places.some((place) => place.building);
  return (
    <DataTable
      caption={caption}
      rows={rows}
      getRowKey={(row) => row.place._id}
      columns={[
        {
          id: "place",
          header: UI.tdPlace[locale],
          rowHeader: true,
          cell: ({ place }) => (
            <NextLink href={localePath(locale, `/places/${place.slug.current}`)} className="font-semibold">
              {pick(place.name, locale)}
            </NextLink>
          ),
        },
        {
          id: "now",
          header: UI.tdNow[locale],
          cell: ({ place, status }) => (
            <span className="flex flex-col items-start gap-[var(--space-1)]">
              <PlaceStatusTag locale={locale} status={status} />
              <span className="text-sm text-ink-600">{placeStatusLine(place, status, now, locale)}</span>
            </span>
          ),
        },
        { id: "today", header: UI.tdTodayHours[locale], cell: ({ place }) => todayHoursText(place.openingHours, now, locale) },
        ...(hasBuilding
          ? [{ id: "building", header: UI.tdBuilding[locale], mobileHidden: true, cell: ({ place }: { place: CampusPlace }) => (place.building ? pick(place.building, locale) : "") }]
          : []),
      ]}
    />
  );
}
