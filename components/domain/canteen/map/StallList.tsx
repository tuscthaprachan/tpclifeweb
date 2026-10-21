/**
 * The accessible equivalent of the floor plan: every stall as text, in
 * walking order. It says what the map shows (number, name, cuisine,
 * directions, matching dishes, route stop) without needing to see the
 * drawing. Works with no script.
 */

import { compareStallsByWalk } from "@/lib/canteen/derive";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";

import type { MapHighlight } from "./CanteenMap";
import { MAP_STRINGS, cuisineLabel } from "./strings";

export interface StallListProps {
  locale: Locale;
  data: CanteenData;
  matchCounts?: ReadonlyMap<string, number>;
  highlights?: readonly MapHighlight[];
  /** Stall names are links to the stall page. Defaults to true. */
  linkStalls?: boolean;
  /** A query string kept on stall links, for example the active filters. */
  query?: string;
  /** The id of a visible heading that names the list. When absent the list carries its own label. */
  labelledBy?: string;
  className?: string;
}

export function StallList({
  locale,
  data,
  matchCounts,
  highlights = [],
  linkStalls = true,
  query,
  labelledBy,
  className,
}: StallListProps) {
  const stalls = [...data.stalls].sort(compareStallsByWalk);
  const search = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  const stops = new Map<string, { order: number; label?: string }>();
  highlights.forEach((highlight, position) => {
    if (!stops.has(highlight.stallId)) stops.set(highlight.stallId, { order: highlight.order ?? position + 1, label: highlight.label });
  });
  const total = stops.size;

  return (
    <ol
      className={`m-0 flex list-none flex-col gap-3 p-0 ${className ?? ""}`.trim()}
      {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": MAP_STRINGS.listHeading[locale] })}
    >
      {stalls.map((stall) => {
        const name = pick(stall.name, locale);
        const wayfinding = pick(stall.wayfinding, locale);
        const count = matchCounts ? (matchCounts.get(stall._id) ?? 0) : undefined;
        const stop = stops.get(stall._id);
        const cuisines = stall.cuisine.map((cuisine) => cuisineLabel(cuisine, locale)).filter(Boolean).join(", ");

        return (
          <li
            key={stall._id}
            className={[
              "flex gap-3 rounded-panel bg-surface p-3",
              stop ? "border-[length:var(--border-width-thick)] border-solid border-action" : "border border-line",
              count === 0 ? "border-dashed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-pill bg-welfare px-2 font-semibold text-ink-on-fill"
            >
              <span className="visually-hidden">{MAP_STRINGS.stall[locale]} </span>
              {stall.number}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              {stop ? (
                <p className="m-0 text-sm font-semibold text-ink-900">
                  {MAP_STRINGS.stopOf(stop.order, total, locale)}
                  {stop.label ? <span className="font-normal">{`: ${stop.label}`}</span> : null}
                </p>
              ) : null}
              <p className="m-0 font-semibold text-ink-900">
                {linkStalls ? (
                  <a href={`${localePath(locale, `/eat/stalls/${stall.slug.current}`)}${search}`} className="text-action underline">
                    {name}
                  </a>
                ) : (
                  name
                )}
              </p>
              {cuisines ? <p className="m-0 text-sm text-ink-600">{cuisines}</p> : null}
              <p className="m-0 text-sm text-ink-600">{wayfinding || MAP_STRINGS.noWayfinding[locale]}</p>
              {count !== undefined ? (
                <p className="m-0 text-sm font-semibold text-ink-900">{MAP_STRINGS.matchCount(count, locale)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
