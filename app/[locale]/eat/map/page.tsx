/**
 * The full canteen map. Reads the shared canteen filter parameters, so
 * "no pork, under 50 baht" set on the dishes page carries over: with any
 * filter on, each stall shows how many dishes match and stalls with none
 * are hatched. Two extra parameters draw a route:
 *
 *   highlight  comma separated stall slugs, drawn as numbered stops
 *   from       index of the entrance the route starts at (0 is the first)
 *
 * Everything is server rendered, so it works with JavaScript off. The floor
 * plan is from a survey, not a live feed.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActiveFilterBar, EAT, EatTabs, eatHref, readFilters, redirectToTidyQuery, t } from "@/components/domain/canteen";
import { CanteenMapWithList, MAP_STRINGS, cellCentre, entrancePoint, hasFloorPlan, routeOrder } from "@/components/domain/canteen/map";
import type { MapHighlight } from "@/components/domain/canteen/map";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { liveRegionProps } from "@/lib/a11y";
import { applyFilters, countActiveValues, indexCanteen, serialise } from "@/lib/canteen";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";
import type { CanteenStall } from "@/lib/content/types";

const ROUTE = "/eat/map";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Slugs from `highlight`, deduplicated, at most 12 so a hand edited link cannot flood the plan. */
function parseHighlightSlugs(raw: string | string[] | undefined): string[] {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const slugs = values.flatMap((value) => value.split(",")).map((slug) => slug.trim()).filter(Boolean);
  return [...new Set(slugs)].slice(0, 12);
}

function parseEntranceIndex(raw: string | undefined, count: number): number | undefined {
  if (raw === undefined || !/^\d{1,3}$/.test(raw)) return undefined;
  const index = Number(raw);
  return index < count ? index : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/eat/map"),
    title: MAP_STRINGS.pageTitle[locale],
    description: MAP_STRINGS.pageIntro[locale],
  };
}

export default async function CanteenMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  redirectToTidyQuery(localePath(locale, ROUTE), query);
  const data = await getCanteenData();
  const filters = readFilters(query);
  const filtersActive = countActiveValues(filters) > 0;
  const filterQuery = serialise(filters);

  const crumbs = [
    { label: UI.home[locale], path: "/" },
    { label: t(EAT.title, locale), path: "/eat" },
    { label: MAP_STRINGS.pageTitle[locale] },
  ];
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{MAP_STRINGS.pageTitle[locale]}</Heading>
      <p className="m-0 text-ink-600">{MAP_STRINGS.pageIntro[locale]}</p>
    </Stack>
  );

  if (!hasFloorPlan(data.settings, data.stalls)) {
    return (
      <Container className="pb-8 pt-2">
        <Breadcrumbs locale={locale} items={crumbs} />
        <Stack space={6}>
          {header}
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
        </Stack>
      </Container>
    );
  }

  const settings = data.settings!;
  const entrances = settings.entrances ?? [];

  // Dishes that pass the filters, counted per stall. Every stall gets an entry, so "none" is a real zero.
  let matchCounts: Map<string, number> | undefined;
  let matchingStalls = 0;
  if (filtersActive) {
    matchCounts = new Map(data.stalls.map((stall) => [stall._id, 0]));
    for (const dish of applyFilters(data, filters, new Date(), { locale })) {
      matchCounts.set(dish.stallId, (matchCounts.get(dish.stallId) ?? 0) + 1);
    }
    matchingStalls = [...matchCounts.values()].filter((count) => count > 0).length;
  }

  // Route: the named stalls, in a sensible order from the chosen entrance (the first one if none is given).
  const { stallBySlug } = indexCanteen(data);
  const named = parseHighlightSlugs(query.highlight)
    .map((slug) => stallBySlug.get(slug))
    .filter((stall): stall is CanteenStall => stall !== undefined);
  const entranceIndex = named.length > 0 || query.from !== undefined ? (parseEntranceIndex(firstParam(query.from), entrances.length) ?? (entrances.length > 0 ? 0 : undefined)) : undefined;
  const origin = entranceIndex !== undefined ? entrances[entranceIndex] : undefined;
  const start = origin ? entrancePoint(origin) : named[0] ? cellCentre(named[0].mapCell) : undefined;
  const route = start ? routeOrder(named, start) : named;
  const view = firstParam(query.view) === "list" ? "list" : "plan";
  const carried: Record<string, string> = {};
  for (const name of ["highlight", "from", "view"]) {
    const value = name === "highlight" ? parseHighlightSlugs(query.highlight).join(",") : firstParam(query[name]);
    if (value) carried[name] = value;
  }
  const viewHref = (next: "list" | undefined) => {
    const { view: _view, ...rest } = carried;
    return eatHref(locale, ROUTE, filters, next ? { ...rest, view: next } : rest);
  };
  const highlights: MapHighlight[] = route.map((stall, position) => ({ stallId: stall._id, order: position + 1 }));

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={crumbs} />
      <Stack space={4}>
        {header}
        <EatTabs locale={locale} current="map" filters={filters} />

        {filtersActive ? (
          <ActiveFilterBar locale={locale} filters={filters} route={ROUTE} extra={carried} editHref={eatHref(locale, "/eat/dishes", filters)} />
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
      </Stack>
    </Container>
  );
}
