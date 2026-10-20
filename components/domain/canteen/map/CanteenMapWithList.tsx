/**
 * The map and its list together.
 *
 * Wide screens: the list on the left, the full plan on the right (the plan
 * stays in view while the list scrolls). Narrow screens: the list first, then
 * a compact static plan. The two plans are the same data drawn twice and CSS
 * shows one; `display: none` also removes the hidden one from the tab order
 * and the accessibility tree, so nothing is announced or focused twice.
 * Nothing scrolls sideways at 320 px.
 */

import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";

import { CanteenMap, type MapHighlight } from "./CanteenMap";
import { StallList } from "./StallList";
import { MAP_STRINGS } from "./strings";

export interface CanteenMapWithListProps {
  locale: Locale;
  data: CanteenData;
  matchCounts?: ReadonlyMap<string, number>;
  highlights?: readonly MapHighlight[];
  entranceIndex?: number;
  /** A query string kept on stall links. */
  query?: string;
  /** Depth of the list and map headings. Defaults to 2. */
  headingLevel?: HeadingLevel;
  /** Prefix for element ids when two of these share a page. */
  idPrefix?: string;
}

function MapKey({
  locale,
  data,
  entranceIndex,
  routed,
}: {
  locale: Locale;
  data: CanteenData;
  entranceIndex?: number;
  routed: boolean;
}) {
  const entrances = data.settings?.entrances ?? [];
  const hasSeating = (data.settings?.seatingZones ?? []).length > 0;
  const start = entranceIndex !== undefined ? entrances[entranceIndex] : undefined;
  if (entrances.length === 0 && !hasSeating && !routed) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 text-sm text-ink-600">
      {entrances.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {entrances.map((entrance, index) => (
            <li key={entrance._key}>
              <strong className="text-ink-900">{`${MAP_STRINGS.entranceKey(index + 1)} `}</strong>
              {`${MAP_STRINGS.entrance[locale]}: ${pick(entrance.label, locale)}`}
            </li>
          ))}
        </ul>
      ) : null}
      {start ? <p className="m-0 font-semibold text-ink-900">{MAP_STRINGS.routeFrom(pick(start.label, locale), locale)}</p> : null}
      {hasSeating ? <p className="m-0">{MAP_STRINGS.keySeating[locale]}</p> : null}
      {routed ? <p className="m-0">{MAP_STRINGS.keyStops[locale]}</p> : null}
      <p className="m-0">{MAP_STRINGS.surveyNote[locale]}</p>
    </div>
  );
}

export function CanteenMapWithList({
  locale,
  data,
  matchCounts,
  highlights = [],
  entranceIndex,
  query,
  headingLevel = 2,
  idPrefix = "cmwl",
}: CanteenMapWithListProps) {
  const listId = `${idPrefix}-list`;
  const mapLevel = headingLevel;
  const routed = highlights.length > 0;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby={listId}>
        <Heading level={headingLevel} id={listId}>
          {MAP_STRINGS.listHeading[locale]}
        </Heading>
        <p className="m-0 text-sm text-ink-600">{MAP_STRINGS.listNote[locale]}</p>
        {matchCounts ? <p className="m-0 text-sm text-ink-600">{MAP_STRINGS.matchHint[locale]}</p> : null}
        <StallList
          locale={locale}
          data={data}
          matchCounts={matchCounts}
          highlights={highlights}
          query={query}
          labelledBy={listId}
        />
      </section>

      <section
        className="hidden min-w-0 md:sticky md:top-[calc(var(--header-height,4rem)+var(--space-4))] md:block"
        aria-labelledby={`${idPrefix}-plan-wide`}
      >
        <Heading level={mapLevel} id={`${idPrefix}-plan-wide`}>
          {MAP_STRINGS.mapHeading[locale]}
        </Heading>
        <div className="mt-3">
          <CanteenMap
            locale={locale}
            data={data}
            matchCounts={matchCounts}
            highlights={highlights}
            entranceIndex={entranceIndex}
            query={query}
            idPrefix={`${idPrefix}-wide`}
          />
        </div>
        <MapKey locale={locale} data={data} entranceIndex={entranceIndex} routed={routed} />
      </section>

      <section className="min-w-0 md:hidden" aria-labelledby={`${idPrefix}-plan-narrow`}>
        <Heading level={mapLevel} id={`${idPrefix}-plan-narrow`}>
          {MAP_STRINGS.mapHeading[locale]}
        </Heading>
        <div className="mt-3">
          <CanteenMap
            locale={locale}
            data={data}
            matchCounts={matchCounts}
            highlights={highlights}
            entranceIndex={entranceIndex}
            compact
            linkStalls={false}
            idPrefix={`${idPrefix}-narrow`}
          />
        </div>
        <MapKey locale={locale} data={data} entranceIndex={entranceIndex} routed={routed} />
      </section>
    </div>
  );
}
