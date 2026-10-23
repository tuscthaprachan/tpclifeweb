/**
 * The canteen floor plan as an inline SVG, drawn from `canteenSettings` and
 * each stall's `mapCell`, so editors move stalls without touching code.
 *
 * It is a server component with no script: links, focus rings and the
 * responsive scaling are all markup and CSS. The plan is SUPPLEMENTARY.
 * `StallList` carries the same information as text and is what a screen
 * reader should meet first.
 *
 * Nothing on the plan is a live signal. Positions come from a survey.
 *
 * Keyboard order: the tiles are emitted in walking order (stall number), never in highlight or drawing order. Tiles do not overlap, so the
 * z-order is unaffected.
 *
 * A stall with a `shape` other than rect is a triangular kiosk. Its numbers
 * sit near the right angle, where the tile is widest, and its name is left to
 * the stall list, which carries every full name.
 *
 * Landmarks (stairs, lifts, toilets, ATM, the north lobby) are drawn as
 * hatched blocks so the plan matches the building. They are neither stalls
 * nor seating, and not interactive.
 *
 * Colour is never the only cue: a match count is a number in text, a stall
 * with none gets diagonal hatching AND the text "0", a highlighted stall
 * gets a thicker double outline AND a numbered marker.
 */

import type { ReactNode } from "react";

import { compareStallsByWalk } from "@/lib/canteen/derive";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { CanteenCuisine, CanteenData, CanteenEntrance, CanteenStall, FloorSide } from "@/lib/content/types";

import {
  CELL,
  TILE_GAP,
  cellCentre,
  cellRect,
  charsThatFit,
  cellShape,
  entrancePoint,
  fromRightAngle,
  planLayout,
  toView,
  trianglePath,
  truncate,
  type PlanLayout,
} from "./geometry";
import { MAP_STRINGS } from "./strings";
import "./map.css";

export interface MapHighlight {
  stallId: string;
  /** Position in the walking route, from 1. Defaults to the position in the `highlights` array. */
  order?: number;
  /** Extra text for the list, for example "Fixture dish A". */
  label?: string;
}

export interface CanteenMapProps {
  locale: Locale;
  data: CanteenData;
  /** Dishes matching the active filters, by stall id. When given, every stall shows its count and stalls with none are hatched. */
  matchCounts?: ReadonlyMap<string, number>;
  highlights?: readonly MapHighlight[];
  /** Index into `settings.entrances`: where the route starts. */
  entranceIndex?: number;
  /** A plan with numbers only, no labels. Tiles are not links unless `linkStalls` says so. */
  compact?: boolean;
  /** In `compact`: number every stall (the default) or only the highlighted ones, drawn larger, so a mini map reads at a small width. */
  numbers?: "all" | "highlighted";
  /** Draw at this many CSS pixels per view unit instead of filling the width, for a plan that scrolls sideways at a readable size. */
  fixedScale?: number;
  /** Each tile is a link to the stall page. Defaults to true, except in `compact`, where tiles are small. Linked tiles must be at least 24 CSS px across. */
  linkStalls?: boolean;
  /** A query string (with or without the leading `?`) kept on stall links, for example the active filters. */
  query?: string;
  /** Prefix for element ids, needed only when two maps share a page. */
  idPrefix?: string;
  className?: string;
}

/** 12 by 12 line glyphs, one per cuisine. Decorative: the stall list names the cuisine in words. */
const GLYPHS: Record<CanteenCuisine, ReactNode> = {
  thaiRice: <path d="M1 6 H11 A5 5 0 0 1 1 6 Z" />,
  madeToOrder: (
    <>
      <circle cx="5" cy="6" r="3.5" />
      <path d="M8.5 6 H12" />
    </>
  ),
  noodles: <path d="M0.5 4 q1.75 -3 3.5 0 t3.5 0 t3.5 0 M0.5 8.5 q1.75 -3 3.5 0 t3.5 0 t3.5 0" />,
  isan: <path d="M2 2.5 Q11 1 10 11 Q5 8 2 2.5 Z" />,
  chickenRice: (
    <>
      <ellipse cx="6" cy="6.5" rx="5" ry="3.5" />
      <circle cx="6" cy="6.5" r="1.2" />
    </>
  ),
  curryOverRice: (
    <>
      <path d="M1 7 H11 A5 4.5 0 0 1 1 7 Z" />
      <circle cx="6" cy="4" r="1.6" />
    </>
  ),
  muslim: <path d="M8 1 A5 5 0 1 0 8 11 A3.8 3.8 0 1 1 8 1 Z" />,
  international: (
    <>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 6 H10.5 M6 1.5 C3.5 4 3.5 8 6 10.5 C8.5 8 8.5 4 6 1.5" fill="none" stroke="currentColor" strokeWidth="1" />
    </>
  ),
  drinks: <path d="M2 2 H10 L9 11 H3 Z" />,
  desserts: (
    <>
      <path d="M2.5 6 H9.5 L6 11.5 Z" />
      <circle cx="6" cy="4" r="2.4" />
    </>
  ),
  fruit: (
    <>
      <circle cx="6" cy="7" r="4" />
      <path d="M6 3 Q6 1 8.5 1" />
    </>
  ),
};

function queryString(query: string | undefined): string {
  if (!query) return "";
  return query.startsWith("?") ? query : `?${query}`;
}

function stallName(stall: CanteenStall, locale: Locale): string {
  return pick(stall.name, locale);
}

/** The accessible name of a tile: what the sighted reader sees, spelled out. */
function tileLabel(stall: CanteenStall, locale: Locale, count: number | undefined, stop: number | undefined): string {
  const parts = [`${stall.number} ${stallName(stall, locale)}`];
  if (count !== undefined) parts.push(count === 0 ? `0, ${MAP_STRINGS.matchCount(0, locale)}` : MAP_STRINGS.matchCount(count, locale));
  if (stop !== undefined) parts.push(MAP_STRINGS.stop(stop, locale));
  return parts.join(", ");
}

interface EntranceDrawProps {
  entrance: CanteenEntrance;
  index: number;
  layout: PlanLayout;
  locale: Locale;
  isStart: boolean;
}

/**
 * One entrance: an arrow on the plan edge pointing in, a numbered badge and a
 * label. Drawn once in a frame where "outward" is up, then turned onto the
 * east or west edge with a rotation, so the text always reads along the edge.
 */
function Entrance({ entrance, index, layout, locale, isStart }: EntranceDrawProps) {
  const edge = toView(entrancePoint(entrance), layout);
  const side: FloorSide = entrance.side;
  const outward = side === "south" ? 1 : -1;
  const transform =
    side === "west"
      ? `translate(${edge.x} ${edge.y}) rotate(-90)`
      : side === "east"
        ? `translate(${edge.x} ${edge.y}) rotate(90)`
        : `translate(${edge.x} ${edge.y})`;
  const label = truncate(pick(entrance.label, locale), 28);
  const key = MAP_STRINGS.entranceKey(index + 1);

  return (
    <g transform={transform} aria-hidden="true">
      <path className="cmap-entrance-arrow" d={`M -7 ${outward * 13} L 7 ${outward * 13} L 0 ${outward * 1} Z`} />
      <rect
        className={isStart ? "cmap-entrance-badge cmap-entrance-badge-start" : "cmap-entrance-badge"}
        x={-14}
        y={outward * 15 - (outward < 0 ? 18 : 0)}
        width={28}
        height={18}
        rx={4}
      />
      <text
        className={isStart ? "cmap-entrance-key cmap-entrance-key-start" : "cmap-entrance-key"}
        x={0}
        y={outward * 15 + (outward < 0 ? -9 : 9)}
      >
        {key}
      </text>
      <text className="cmap-entrance-label" x={0} y={outward * 15 + (outward < 0 ? -22 : 29)}>
        {label}
      </text>
    </g>
  );
}

/** A wavy line from (x, y) running `length` units along an axis, for the river edge. */
function wavePath(x: number, y: number, length: number, vertical: boolean): string {
  const steps = Math.floor(length / 16);
  const step = vertical ? " q -3 4 0 8 t 0 8" : " q 4 -3 8 0 t 8 0";
  return `M ${x} ${y}${step.repeat(steps)}`;
}

/** The river edge: a band along one side of the plan with its label and a wavy line on the plan side. */
function River({ side, layout, locale }: { side: FloorSide; layout: PlanLayout; locale: Locale }) {
  const band = 20;
  const vertical = side === "west" || side === "east";
  const x = side === "east" ? layout.width - band : 0;
  const y = side === "south" ? layout.height - band : 0;
  const width = vertical ? band : layout.width;
  const height = vertical ? layout.height : band;
  const centre = { x: x + width / 2, y: y + height / 2 };
  const waveX = side === "west" ? band : side === "east" ? layout.width - band : 0;
  const waveY = side === "north" ? band : side === "south" ? layout.height - band : 0;
  const rotate = side === "west" ? -90 : side === "east" ? 90 : 0;

  return (
    <g aria-hidden="true">
      <rect className="cmap-river" x={x} y={y} width={width} height={height} />
      <path className="cmap-river-wave" d={wavePath(waveX, waveY, vertical ? layout.height : layout.width, vertical)} />
      <text
        className="cmap-river-label"
        x={centre.x}
        y={centre.y}
        transform={rotate ? `rotate(${rotate} ${centre.x} ${centre.y})` : undefined}
      >
        {MAP_STRINGS.riverSide[locale]}
      </text>
    </g>
  );
}

export function CanteenMap({
  locale,
  data,
  matchCounts,
  highlights = [],
  entranceIndex,
  compact = false,
  numbers = "all",
  fixedScale,
  linkStalls,
  query,
  idPrefix,
  className,
}: CanteenMapProps) {
  const { settings, stalls } = data;
  if (!settings || stalls.length === 0) return null;

  const links = linkStalls ?? !compact;
  const mini = compact && numbers === "highlighted";
  const id = idPrefix ?? (compact ? "cmap-c" : "cmap");
  const layout = planLayout(settings, stalls, { compact });
  const entrances = compact ? [] : (settings.entrances ?? []);
  const seatingZones = settings.seatingZones ?? [];
  const landmarks = settings.landmarks ?? [];
  const outline = (settings.outline ?? []).length >= 3 ? settings.outline! : null;
  const ordered = [...stalls].sort(compareStallsByWalk);
  const search = queryString(query);

  const stops = new Map<string, number>();
  highlights.forEach((highlight, position) => {
    if (!stops.has(highlight.stallId)) stops.set(highlight.stallId, highlight.order ?? position + 1);
  });
  const origin = entranceIndex !== undefined ? (settings.entrances ?? [])[entranceIndex] : undefined;

  // The route: from the chosen entrance (if any) through the stops in their order.
  const routePoints: { x: number; y: number }[] = [];
  if (origin) routePoints.push(toView(entrancePoint(origin), layout));
  [...highlights]
    .map((highlight, position) => ({ stall: stalls.find((s) => s._id === highlight.stallId), order: highlight.order ?? position + 1 }))
    .filter((entry): entry is { stall: CanteenStall; order: number } => entry.stall !== undefined)
    .sort((a, b) => a.order - b.order)
    .forEach(({ stall }) => routePoints.push(toView(cellCentre(stall.mapCell), layout)));
  const showRoute = routePoints.length >= 2;

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const hatchId = `${id}-hatch`;
  const landmarkId = `${id}-landmark`;
  const marks: ReactNode[] = [];
  const planRect = { x: layout.margins.left, y: layout.margins.top, w: layout.cols * CELL, h: layout.rows * CELL };

  const labelProps = links
    ? ({ role: "group", "aria-labelledby": `${titleId} ${descId}` } as const)
    : ({ role: "img", "aria-labelledby": `${titleId} ${descId}` } as const);
  const marked = ordered
    .filter((stall) => stops.has(stall._id))
    .sort((a, b) => (stops.get(a._id) ?? 0) - (stops.get(b._id) ?? 0))
    .map((stall) => `${MAP_STRINGS.stallNumber(stall.number, locale)}, ${stallName(stall, locale)}`);
  const description = !links && marked.length > 0 ? `${MAP_STRINGS.svgDesc[locale]} ${MAP_STRINGS.svgMarked(marked, locale)}` : MAP_STRINGS.svgDesc[locale];

  return (
    <svg
      {...labelProps}
      className={compact ? `cmap cmap-compact${mini ? " cmap-mini" : ""} ${className ?? ""}`.trim() : `cmap ${className ?? ""}`.trim()}
      style={fixedScale ? { inlineSize: Math.round(layout.width * fixedScale), maxInlineSize: "none" } : undefined}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{MAP_STRINGS.svgTitle[locale]}</title>
      <desc id={descId}>{description}</desc>
      <defs>
        <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className="cmap-hatch-line" x1="0" y1="0" x2="0" y2="8" />
        </pattern>
        <pattern id={landmarkId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line className="cmap-landmark-line" x1="0" y1="0" x2="0" y2="10" />
        </pattern>
      </defs>

      {settings.riverSide && !compact ? <River side={settings.riverSide} layout={layout} locale={locale} /> : null}

      {outline ? (
        <path
          className="cmap-plan"
          d={`M ${outline.map((corner) => { const p = toView({ x: corner.col, y: corner.row }, layout); return `${p.x} ${p.y}`; }).join(" L ")} Z`}
          aria-hidden="true"
        />
      ) : (
        <rect className="cmap-plan" x={planRect.x} y={planRect.y} width={planRect.w} height={planRect.h} rx={6} aria-hidden="true" />
      )}

      {landmarks.map((landmark) => {
        const rect = cellRect(landmark, layout, TILE_GAP / 2);
        const upright = rect.h > rect.w;
        const text = truncate(pick(landmark.label, locale), charsThatFit(upright ? rect.h - 8 : rect.w - 8, 13));
        const middle = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
        return (
          <g key={landmark._key} aria-hidden="true">
            <rect className="cmap-landmark" x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={4} />
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={4} fill={`url(#${landmarkId})`} />
            {compact ? null : (
              <text
                className="cmap-landmark-text"
                x={middle.x}
                y={middle.y}
                textAnchor="middle"
                dominantBaseline="central"
                transform={upright ? `rotate(-90 ${middle.x} ${middle.y})` : undefined}
              >
                {text}
              </text>
            )}
          </g>
        );
      })}

      {seatingZones.map((zone) => {
        const rect = cellRect(zone, layout, TILE_GAP / 2);
        const text = truncate(pick(zone.label, locale), charsThatFit(rect.w - 8, 14));
        return (
          <g key={zone._key} aria-hidden="true">
            <rect className="cmap-seat" x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={6} />
            {compact ? null : (
              <text className="cmap-text-plain" x={rect.x + rect.w / 2} y={rect.y + rect.h / 2} textAnchor="middle" dominantBaseline="central">
                {text}
              </text>
            )}
          </g>
        );
      })}

      {showRoute ? (
        <polyline className="cmap-route" points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")} aria-hidden="true" />
      ) : null}

      {ordered.map((stall) => {
        const rect = cellRect(stall.mapCell, layout, TILE_GAP / 2);
        const count = matchCounts ? (matchCounts.get(stall._id) ?? 0) : undefined;
        const none = count === 0;
        const stop = stops.get(stall._id);
        const highlighted = stop !== undefined;
        const name = stallName(stall, locale);
        const roomForText = rect.w - 16 - (highlighted ? 26 : 0);
        const nameFits = Array.from(name).length <= charsThatFit(roomForText, 13);
        const squeezable = Array.from(name).length <= charsThatFit(roomForText, 13) / 0.7;
        const nameClipId = `${id}-name-${stall.number}`;
        const glyphs = stall.cuisine.slice(0, 3);
        const shape = cellShape(stall.mapCell);
        const triangle = shape !== "rect";
        const tileClass = none ? "cmap-tile cmap-tile-none" : "cmap-tile";
        // Where a triangle's numbers go, measured in from the right angle (across the base, up the side).
        const spot = (along: number, up: number) => fromRightAngle(rect, shape, along, up) ?? { x: rect.x, y: rect.y };
        const showNumber = !mini || highlighted;
        const showMark = highlighted && !(mini && stops.size <= 1);
        const counted = compact && count !== undefined;
        const pillAt = triangle ? (mini ? spot(40, 34) : compact ? (counted ? spot(42, 56) : spot(44, 44)) : spot(28, 22)) : null;
        const badgeAt = triangle ? (compact ? spot(28, 20) : spot(28, 56)) : null;
        const markAt = triangle ? spot(compact ? 84 : 64, compact ? 18 : 20) : null;
        const markX = markAt ? markAt.x : rect.x + rect.w - (compact ? 16 : 18);
        const markY = markAt ? markAt.y : rect.y + rect.h - (compact ? 16 : 18);
        if (triangle && !compact && badgeAt && count !== undefined) {
          marks.push(
            <g key={`${stall._id}-count`} aria-hidden="true">
              <rect className="cmap-badge" x={badgeAt.x - 11} y={badgeAt.y - 11} width={22} height={22} rx={5} />
              <text className="cmap-badge-text" x={badgeAt.x} y={badgeAt.y + 0.5}>
                {count}
              </text>
            </g>,
          );
        }
        if (showMark) {
          marks.push(
            <g key={stall._id} aria-hidden="true">
              <circle className="cmap-mark" cx={markX} cy={markY} r={compact ? 15 : 16} />
              <text className="cmap-mark-text" x={markX} y={markY + 1}>
                {stop}
              </text>
            </g>,
          );
        }

        const body = (
          <>
            {triangle ? (
              <>
                <path className={tileClass} d={trianglePath(rect, shape)!} />
                {none ? <path d={trianglePath(rect, shape)!} fill={`url(#${hatchId})`} /> : null}
              </>
            ) : (
              <>
                <rect className={tileClass} x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={8} />
                {none ? <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={8} fill={`url(#${hatchId})`} /> : null}
              </>
            )}
            {highlighted ? (
              triangle ? (
                <>
                  <path className="cmap-hl-outer" d={trianglePath(rect, shape, 4)!} />
                  <path className="cmap-hl-inner" d={trianglePath(rect, shape, -1)!} />
                </>
              ) : (
                <>
                  <rect className="cmap-hl-outer" x={rect.x - 4} y={rect.y - 4} width={rect.w + 8} height={rect.h + 8} rx={11} />
                  <rect className="cmap-hl-inner" x={rect.x + 1} y={rect.y + 1} width={rect.w - 2} height={rect.h - 2} rx={7} />
                </>
              )
            ) : null}

            {triangle && pillAt && badgeAt ? (
              compact ? (
                <>
                  {showNumber ? (
                    <>
                      <rect className="cmap-pill" x={pillAt.x - (mini ? 34 : 26)} y={pillAt.y - (mini ? 24 : 17)} width={mini ? 68 : 52} height={mini ? 48 : 34} rx={mini ? 24 : 17} />
                      <text className={mini ? "cmap-number cmap-number-tri" : "cmap-number"} x={pillAt.x} y={pillAt.y + 1}>
                        {stall.number}
                      </text>
                    </>
                  ) : null}
                  {counted ? (
                    <>
                      <rect className="cmap-badge" x={badgeAt.x - 19} y={badgeAt.y - 15} width={38} height={30} rx={6} />
                      <text className="cmap-badge-text" x={badgeAt.x} y={badgeAt.y + 1}>
                        {count}
                      </text>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <rect className="cmap-pill" x={pillAt.x - 19} y={pillAt.y - 15} width={38} height={30} rx={15} />
                  <text className="cmap-number" x={pillAt.x} y={pillAt.y + 0.5}>
                    {stall.number}
                  </text>

                </>
              )
            ) : compact ? (
              <>
                {showNumber ? (
                  <>
                    <rect className="cmap-pill" x={rect.x + (counted ? 8 : rect.w / 2 - (mini ? 43 : 26))} y={rect.y + rect.h / 2 - (mini ? 27 : 17)} width={mini ? 86 : 52} height={mini ? 54 : 34} rx={mini ? 27 : 17} />
                    <text className="cmap-number" x={rect.x + (counted ? 34 : rect.w / 2)} y={rect.y + rect.h / 2 + 1}>
                      {stall.number}
                    </text>
                  </>
                ) : null}
                {counted ? (
                  <>
                    <rect className="cmap-badge" x={rect.x + 66} y={rect.y + rect.h / 2 - 15} width={38} height={30} rx={6} />
                    <text className="cmap-badge-text" x={rect.x + 85} y={rect.y + rect.h / 2 + 1}>
                      {count}
                    </text>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <rect className="cmap-pill" x={rect.x + 4} y={rect.y + 4} width={38} height={30} rx={15} />
                <text className="cmap-number" x={rect.x + 23} y={rect.y + 19.5}>
                  {`${stall.number} `}
                </text>
                {glyphs.map((cuisine, position) => (
                  <g
                    key={cuisine}
                    className="cmap-glyph"
                    transform={`translate(${rect.x + 8 + position * 16} ${rect.y + 36})`}
                    aria-hidden="true"
                  >
                    {GLYPHS[cuisine]}
                  </g>
                ))}
                {nameFits || squeezable ? null : (
                  <clipPath id={nameClipId}>
                    <rect x={rect.x + 4} y={rect.y} width={roomForText + 4} height={rect.h} />
                  </clipPath>
                )}
                <text
                  className={none ? "cmap-text cmap-text-soft" : "cmap-text"}
                  x={rect.x + 8}
                  y={rect.y + rect.h - 9}
                  {...(nameFits ? {} : squeezable ? { textLength: roomForText, lengthAdjust: "spacingAndGlyphs" } : { clipPath: `url(#${nameClipId})` })}
                >
                  {`${name} `}
                </text>
                {count !== undefined ? (
                  <>
                    <rect className="cmap-badge" x={rect.x + rect.w - 26} y={rect.y + 8} width={22} height={22} rx={5} />
                    <text className="cmap-badge-text" x={rect.x + rect.w - 15} y={rect.y + 19.5}>
                      {`${count} `}
                    </text>
                  </>
                ) : null}
              </>
            )}

            {links ? (
              triangle ? (
                <>
                  <path className="cmap-ring-outer" d={trianglePath(rect, shape, 2)!} />
                  <path className="cmap-ring-inner" d={trianglePath(rect, shape, 2)!} />
                </>
              ) : (
                <>
                  <rect className="cmap-ring-outer" x={rect.x - 2} y={rect.y - 2} width={rect.w + 4} height={rect.h + 4} rx={10} />
                  <rect className="cmap-ring-inner" x={rect.x - 2} y={rect.y - 2} width={rect.w + 4} height={rect.h + 4} rx={10} />
                </>
              )
            ) : null}
          </>
        );

        return links ? (
          <a
            key={stall._id}
            className="cmap-link"
            href={`${localePath(locale, `/eat/stalls/${stall.slug.current}`)}${search}`}
            aria-label={tileLabel(stall, locale, count, stop)}
          >
            {body}
          </a>
        ) : (
          <g key={stall._id}>
            {body}
          </g>
        );
      })}

      {marks.length > 0 ? <g className="cmap-marks">{marks}</g> : null}

      {entrances.map((entrance, index) => (
        <Entrance
          key={entrance._key}
          entrance={entrance}
          index={index}
          layout={layout}
          locale={locale}
          isStart={origin === entrance}
        />
      ))}
    </svg>
  );
}
