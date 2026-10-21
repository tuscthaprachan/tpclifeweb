/**
 * The map and its list together.
 *
 * Wide screens: the list on the left, the full plan on the right (the plan
 * stays in view while the list scrolls). Narrow screens: with `viewLinks`, a
 * Plan / List switch of real links (the plan is the default, the list is
 * `?view=list`); without it, the list then the plan. The phone plan is drawn
 * at a fixed readable scale inside a labelled, focusable scroll region rather
 * than shrunk to the screen width, because stall numbers on a 358 px wide
 * 17 by 7 plan would be about 4 px tall. Rotating the plan was rejected: it
 * would turn north into east and need four triangle orientations. The plans
 * are the same data drawn twice and CSS shows one; `display: none` also
 * removes the hidden one from the tab order and the accessibility tree, so
 * nothing is announced or focused twice. Nothing but the plan scrolls
 * sideways at 320 px.
 */

import Link from "next/link";

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
  /** Which of plan and list a phone shows. Leave out to show the list then the plan. */
  phoneView?: "plan" | "list";
  /** Where the Plan / List switch goes. When given, a phone shows the switch and one view. */
  viewLinks?: { plan: string; list: string };
}

/** CSS pixels per view unit for the phone plan: compact stall numbers (26 units) come out at 13 px. */
const PHONE_SCALE = 0.5;

function MapKey({
  locale,
  data,
  entranceIndex,
  routed,
  hint,
}: {
  locale: Locale;
  data: CanteenData;
  entranceIndex?: number;
  routed: boolean;
  hint?: boolean;
}) {
  const entrances = data.settings?.entrances ?? [];
  const hasSeating = (data.settings?.seatingZones ?? []).length > 0;
  const start = entranceIndex !== undefined ? entrances[entranceIndex] : undefined;
  if (entrances.length === 0 && !hasSeating && !routed && !hint) return null;

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
      {hint ? <p className="m-0">{MAP_STRINGS.matchHint[locale]}</p> : null}
    </div>
  );
}

function ViewSwitch({ locale, current, links }: { locale: Locale; current: "plan" | "list"; links: { plan: string; list: string } }) {
  const options = [
    { id: "plan", label: MAP_STRINGS.viewPlan[locale] },
    { id: "list", label: MAP_STRINGS.viewList[locale] },
  ] as const;
  return (
    <nav aria-label={MAP_STRINGS.viewSwitchLabel[locale]} className="md:hidden">
      <ul className="m-0 grid list-none grid-cols-2 gap-1 rounded-pill border border-line-strong bg-surface-sunk p-1">
        {options.map((option) => {
          const selected = option.id === current;
          return (
            <li key={option.id} className="min-w-0">
              <Link
                href={links[option.id]}
                scroll={false}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-[var(--target-min)] w-full items-center justify-center rounded-pill px-3 text-base no-underline ${selected ? "bg-action font-semibold text-action-ink" : "font-medium text-ink-900"}`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
  phoneView,
  viewLinks,
}: CanteenMapWithListProps) {
  const listId = `${idPrefix}-list`;
  const mapLevel = headingLevel;
  const routed = highlights.length > 0;
  const switched = viewLinks !== undefined;
  const view = phoneView ?? "plan";
  const showList = !switched || view === "list";
  const showPhonePlan = !switched || view === "plan";

  return (
    <div className="flex flex-col gap-4">
      {viewLinks ? <ViewSwitch locale={locale} current={view} links={viewLinks} /> : null}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
        <section className={`min-w-0 flex-col gap-3 ${showList ? "flex" : "hidden md:flex"}`} aria-labelledby={listId}>
          <Heading level={headingLevel} id={listId} className={headingLevel === 2 ? "text-xl" : "text-lg"}>
            {MAP_STRINGS.listHeading[locale]}
          </Heading>
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
          <Heading level={mapLevel} id={`${idPrefix}-plan-wide`} className={mapLevel === 2 ? "text-xl" : "text-lg"}>
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

        {showPhonePlan ? (
          <section className="min-w-0 md:hidden" aria-labelledby={`${idPrefix}-plan-narrow`}>
            <Heading level={mapLevel} id={`${idPrefix}-plan-narrow`} className={mapLevel === 2 ? "text-xl" : "text-lg"}>
              {MAP_STRINGS.mapHeading[locale]}
            </Heading>
            <p className="m-0 mt-2 text-sm text-ink-600">{MAP_STRINGS.scrollHint[locale]}</p>
            <div className="cmap-scroll mt-3" role="region" tabIndex={0} aria-label={MAP_STRINGS.scrollRegion[locale]}>
              <CanteenMap
                locale={locale}
                data={data}
                matchCounts={matchCounts}
                highlights={highlights}
                entranceIndex={entranceIndex}
                compact
                fixedScale={PHONE_SCALE}
                linkStalls
                query={query}
                idPrefix={`${idPrefix}-narrow`}
              />
            </div>
            <MapKey locale={locale} data={data} entranceIndex={entranceIndex} routed={routed} hint={matchCounts !== undefined && !showList} />
            {viewLinks ? (
              <p className="m-0 mt-3">
                <Link href={viewLinks.list} scroll={false} className="inline-flex min-h-[var(--target-min)] items-center">
                  {MAP_STRINGS.seeList[locale]}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
