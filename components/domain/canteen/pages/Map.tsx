"use client";

import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { liveRegionProps } from "@/lib/a11y";
import { applyFilters, countActiveValues, indexCanteen, serialise } from "@/lib/canteen";
import type { RawParams } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenStall } from "@/lib/content/types";

import { ActiveFilterBar } from "../ActiveFilterBar";
import { EatTabs } from "../EatTabs";
import { eatHref } from "../links";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { CanteenMapWithList, MAP_STRINGS, cellCentre, entrancePoint, hasFloorPlan, routeOrder } from "../map";
import type { MapHighlight } from "../map";
import { firstParam, readFilters, toSearchParams } from "../query";
import { tidyTarget } from "../redirects";

export const MAP_ROUTE = "/eat/map";

/** Slugs from `highlight`, deduplicated, at most 12 so a hand edited link cannot flood the plan. */
function parseHighlightSlugs(query: RawParams): string[] {
  const slugs = toSearchParams(query)
    .getAll("highlight")
    .flatMap((value) => value.split(","))
    .map((slug) => slug.trim())
    .filter(Boolean);
  return [...new Set(slugs)].slice(0, 12);
}

function parseEntranceIndex(raw: string | undefined, count: number): number | undefined {
  if (raw === undefined || !/^\d{1,3}$/.test(raw)) return undefined;
  const index = Number(raw);
  return index < count ? index : undefined;
}

interface MapResultsProps {
  locale: Locale;
  data: CanteenData;
}

export function LiveMapResults({ locale, data, server }: MapResultsProps & { server?: ServerRender }) {
  const search = useSearch();
  const { now } = useRenderState(search.toString(), server);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, MAP_ROUTE), search)} />
      <MapResults locale={locale} data={data} query={search} now={now} />
    </>
  );
}

export function MapResults({ locale, data, query, now }: MapResultsProps & { query: RawParams; now: Date }) {
  const filters = readFilters(query);
  const filtersActive = countActiveValues(filters) > 0;
  const filterQuery = serialise(filters);

  if (!hasFloorPlan(data.settings, data.stalls)) {
    return (
      <>
        <EatTabs locale={locale} current="map" filters={filters} />
        <EmptyState
          title={MAP_STRINGS.emptyTitle[locale]}
          action={
            <Link href={localePath(locale, "/eat")} className="text-action underline">
              {MAP_STRINGS.backToEat[locale]}
            </Link>
          }
        >
          {MAP_STRINGS.emptyBody[locale]}
        </EmptyState>
      </>
    );
  }

  const settings = data.settings!;
  const entrances = settings.entrances ?? [];

  // Dishes that pass the filters, counted per stall. Every stall gets an entry, so "none" is a real zero.
  let matchCounts: Map<string, number> | undefined;
  let matchingStalls = 0;
  if (filtersActive) {
    matchCounts = new Map(data.stalls.map((stall) => [stall._id, 0]));
    for (const dish of applyFilters(data, filters, now, { locale })) {
      matchCounts.set(dish.stallId, (matchCounts.get(dish.stallId) ?? 0) + 1);
    }
    matchingStalls = [...matchCounts.values()].filter((count) => count > 0).length;
  }

  // Route: the named stalls, in a sensible order from the chosen entrance (the first one if none is given).
  const { stallBySlug } = indexCanteen(data);
  const named = parseHighlightSlugs(query)
    .map((slug) => stallBySlug.get(slug))
    .filter((stall): stall is CanteenStall => stall !== undefined);
  const fromIndex = parseEntranceIndex(firstParam(query, "from"), entrances.length);
  const entranceIndex = fromIndex ?? (named.length > 0 && entrances.length > 0 ? 0 : undefined);
  const origin = entranceIndex !== undefined ? entrances[entranceIndex] : undefined;
  const start = origin ? entrancePoint(origin) : named[0] ? cellCentre(named[0].mapCell) : undefined;
  const route = start ? routeOrder(named, start) : named;
  const view = firstParam(query, "view") === "list" ? "list" : "plan";
  const carried: Record<string, string> = {};
  for (const name of ["highlight", "from", "view"]) {
    const value = name === "highlight" ? parseHighlightSlugs(query).join(",") : name === "from" ? fromIndex?.toString() : firstParam(query, name);
    if (value) carried[name] = value;
  }
  const viewHref = (next: "list" | undefined) => {
    const { view: _view, ...rest } = carried;
    return eatHref(locale, MAP_ROUTE, filters, next ? { ...rest, view: next } : rest);
  };
  const highlights: MapHighlight[] = route.map((stall, position) => ({ stallId: stall._id, order: position + 1 }));

  return (
    <>
      <EatTabs locale={locale} current="map" filters={filters} />

      {filtersActive ? (
        <ActiveFilterBar locale={locale} filters={filters} route={MAP_ROUTE} extra={carried} editHref={eatHref(locale, "/eat/dishes", filters)} />
      ) : null}

      {filtersActive ? (
        <p {...liveRegionProps("polite")} className="m-0 font-semibold text-ink-900">
          {MAP_STRINGS.matchSummary(matchingStalls, locale)}
        </p>
      ) : null}

      <CanteenMapWithList
        locale={locale}
        data={data}
        matchCounts={matchCounts}
        highlights={highlights}
        entranceIndex={entranceIndex}
        query={filterQuery}
        phoneView={view}
        viewLinks={{ plan: viewHref(undefined), list: viewHref("list") }}
      />
    </>
  );
}
