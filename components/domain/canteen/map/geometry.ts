/**
 * Layout maths for the canteen floor plan. Pure: no React, no DOM, so the
 * server render and the unit tests run exactly the same code.
 *
 * Two coordinate systems are used. "Grid units" count cells from the top
 * left of the plan (a stall at col 2, row 1 starts 2 cells in and 1 down).
 * "View units" are the SVG viewBox: grid units times `CELL`, shifted by the
 * margin that makes room for entrance badges and the river band.
 */

import { compareStallsByWalk } from "@/lib/canteen/derive";
import type { CanteenEntrance, CanteenSettings, CanteenStall, FloorSide, MapCell, MapShape } from "@/lib/sanity/types";

/** Side of one grid cell in view units. */
export const CELL = 72;

/** Largest grid accepted, so a mistyped settings value cannot produce a huge drawing. */
export const MAX_GRID = 40;

/** Gap between neighbouring tiles, in view units. */
export const TILE_GAP = 4;

/** Margin on an edge that has an entrance, for the badge and its label. */
const ENTRANCE_BAND = 52;
/** Extra margin on the river edge, for the band that carries its label. */
const RIVER_BAND = 20;
/** Margin on every edge. */
const BASE_MARGIN = 6;

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlanLayout {
  /** Columns and rows actually drawn: the settings grid, grown if a stall or zone sits outside it. */
  cols: number;
  rows: number;
  margins: Margins;
  /** Full viewBox size. */
  width: number;
  height: number;
}

function wholeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
}

/** True when the settings describe a floor plan that can be drawn. */
export function hasFloorPlan(settings: CanteenSettings | null | undefined, stalls: readonly CanteenStall[]): boolean {
  if (!settings || stalls.length === 0) return false;
  return wholeNumber(settings.gridCols, 0) >= 1 && wholeNumber(settings.gridRows, 0) >= 1;
}

/** The wall an entrance sits on, in grid units, at the middle of its cell. The cell is the one just inside the wall. */
export function entrancePoint(entrance: Pick<CanteenEntrance, "col" | "row" | "side">): Point {
  switch (entrance.side) {
    case "north":
      return { x: entrance.col + 0.5, y: entrance.row };
    case "south":
      return { x: entrance.col + 0.5, y: entrance.row + 1 };
    case "west":
      return { x: entrance.col, y: entrance.row + 0.5 };
    case "east":
      return { x: entrance.col + 1, y: entrance.row + 0.5 };
  }
}

/** Grid size actually needed: the settings size, grown to hold every stall, seating zone, landmark and outline corner. */
export function gridExtent(
  settings: Pick<CanteenSettings, "gridCols" | "gridRows" | "seatingZones"> & Partial<Pick<CanteenSettings, "landmarks" | "outline">>,
  stalls: readonly Pick<CanteenStall, "mapCell">[],
): { cols: number; rows: number } {
  let cols = Math.min(MAX_GRID, Math.max(1, wholeNumber(settings.gridCols, 1)));
  let rows = Math.min(MAX_GRID, Math.max(1, wholeNumber(settings.gridRows, 1)));
  const cells: MapCell[] = [...stalls.map((stall) => stall.mapCell), ...(settings.seatingZones ?? []), ...(settings.landmarks ?? [])];
  for (const cell of cells) {
    cols = Math.min(MAX_GRID, Math.max(cols, cell.col + Math.max(1, cell.w)));
    rows = Math.min(MAX_GRID, Math.max(rows, cell.row + Math.max(1, cell.h)));
  }
  for (const corner of settings.outline ?? []) {
    cols = Math.min(MAX_GRID, Math.max(cols, corner.col));
    rows = Math.min(MAX_GRID, Math.max(rows, corner.row));
  }
  return { cols, rows };
}

/** Margins and viewBox size for a plan. `compact` drops the entrance bands, which only carry labels. */
export function planLayout(
  settings: Pick<CanteenSettings, "gridCols" | "gridRows" | "seatingZones" | "entrances" | "riverSide"> &
    Partial<Pick<CanteenSettings, "landmarks" | "outline">>,
  stalls: readonly Pick<CanteenStall, "mapCell">[],
  options: { compact?: boolean } = {},
): PlanLayout {
  const { cols, rows } = gridExtent(settings, stalls);
  const margins: Margins = { top: BASE_MARGIN, right: BASE_MARGIN, bottom: BASE_MARGIN, left: BASE_MARGIN };
  const edge = (side: FloorSide) => (side === "north" ? "top" : side === "south" ? "bottom" : side === "east" ? "right" : "left");
  if (!options.compact) {
    // An entrance set in from the edge of the grid already has room for its badge; only the shortfall becomes margin.
    const band = new Map<FloorSide, number>();
    for (const entrance of settings.entrances ?? []) {
      const at = entrancePoint(entrance);
      const room = CELL * (entrance.side === "north" ? at.y : entrance.side === "west" ? at.x : entrance.side === "south" ? rows - at.y : cols - at.x);
      band.set(entrance.side, Math.max(band.get(entrance.side) ?? 0, ENTRANCE_BAND - Math.max(0, room)));
    }
    for (const [side, amount] of band) margins[edge(side)] += Math.max(0, amount);
    if (settings.riverSide) margins[edge(settings.riverSide)] += RIVER_BAND;
  }
  return {
    cols,
    rows,
    margins,
    width: margins.left + cols * CELL + margins.right,
    height: margins.top + rows * CELL + margins.bottom,
  };
}

/** A grid cell as a rectangle in view units, shrunk by `inset` on every side. */
export function cellRect(cell: MapCell, layout: Pick<PlanLayout, "margins">, inset = 0): Rect {
  return {
    x: layout.margins.left + cell.col * CELL + inset,
    y: layout.margins.top + cell.row * CELL + inset,
    w: Math.max(0, Math.max(1, cell.w) * CELL - inset * 2),
    h: Math.max(0, Math.max(1, cell.h) * CELL - inset * 2),
  };
}

/** The outline of a cell. Anything but a known triangle is a rectangle. */
export function cellShape(cell: Pick<MapCell, "shape">): MapShape {
  return cell.shape === "triangleBottomRight" || cell.shape === "triangleBottomLeft" ? cell.shape : "rect";
}

/**
 * Where the right angle of a triangular cell sits inside a rect, and which
 * way the two legs run from it: `across` is +1 when the horizontal leg runs
 * right, -1 when it runs left; the vertical leg always runs up. Null for a rectangle.
 */
export function rightAngle(rect: Rect, shape: MapShape): { corner: Point; across: 1 | -1 } | null {
  switch (shape) {
    case "triangleBottomRight":
      return { corner: { x: rect.x + rect.w, y: rect.y + rect.h }, across: -1 };
    case "triangleBottomLeft":
      return { corner: { x: rect.x, y: rect.y + rect.h }, across: 1 };
    default:
      return null;
  }
}

/** A point `along` units from the right angle across the horizontal leg and `up` units up the vertical leg. Null for a rectangle. */
export function fromRightAngle(rect: Rect, shape: MapShape, along: number, up: number): Point | null {
  const angle = rightAngle(rect, shape);
  return angle ? { x: angle.corner.x + angle.across * along, y: angle.corner.y - up } : null;
}

/**
 * The three corners of a triangular cell inside a rect, or null for a
 * rectangle. `grow` moves every edge outward by that many units (negative
 * moves it inward), keeping the corners sharp, so a focus ring or an outline
 * can sit a fixed distance from the tile.
 */
export function trianglePoints(rect: Rect, shape: MapShape, grow = 0): Point[] | null {
  const angle = rightAngle(rect, shape);
  if (!angle) return null;
  const { w, h } = rect;
  const k = Math.sqrt(1 / (w * w) + 1 / (h * h));
  const along = w * (1 + grow * k + grow / h);
  const up = h * (1 + grow * k + grow / w);
  const at = (a: number, u: number): Point => ({ x: angle.corner.x + angle.across * a, y: angle.corner.y - u });
  return [at(-grow, -grow), at(along, -grow), at(-grow, up)];
}

/** An SVG path for the triangle, or null for a rectangle. */
export function trianglePath(rect: Rect, shape: MapShape, grow = 0): string | null {
  const points = trianglePoints(rect, shape, grow);
  if (!points) return null;
  return `M ${points.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L ")} Z`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The middle of a cell, in grid units. A triangle gives its centroid, a third of the way in from the right angle. */
export function cellCentre(cell: MapCell): Point {
  const w = Math.max(1, cell.w);
  const h = Math.max(1, cell.h);
  const shape = cellShape(cell);
  if (shape === "triangleBottomRight") return { x: cell.col + w - w / 3, y: cell.row + h - h / 3 };
  if (shape === "triangleBottomLeft") return { x: cell.col + w / 3, y: cell.row + h - h / 3 };
  return { x: cell.col + w / 2, y: cell.row + h / 2 };
}

/** Grid units to view units. */
export function toView(point: Point, layout: Pick<PlanLayout, "margins">): Point {
  return { x: layout.margins.left + point.x * CELL, y: layout.margins.top + point.y * CELL };
}

export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Stalls in walking order: by stall number, then name. Returns a copy. */
export function walkingOrder<T extends CanteenStall>(stalls: readonly T[]): T[] {
  return [...stalls].sort(compareStallsByWalk);
}

/**
 * Index of the entrance closest to a point (grid units) by Manhattan
 * distance, or -1 when there are no entrances. The first entrance wins a tie.
 */
export function nearestEntrance(entrances: readonly Pick<CanteenEntrance, "col" | "row" | "side">[], point: Point): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  entrances.forEach((entrance, index) => {
    const distance = manhattan(entrancePoint(entrance), point);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * A simple walking route: starting at `origin` (grid units), repeatedly go to
 * the nearest unvisited stall by Manhattan distance between cell centres.
 * Ties fall back to walking order, so the result is deterministic. This is a
 * greedy tour, not a shortest path: it is a sensible order to visit, not a
 * promise of the shortest walk.
 */
export function routeOrder<T extends CanteenStall>(stalls: readonly T[], origin: Point): T[] {
  const remaining = walkingOrder(stalls);
  const route: T[] = [];
  let here = origin;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((stall, index) => {
      const distance = manhattan(here, cellCentre(stall.mapCell));
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    route.push(next!);
    here = cellCentre(next!.mapCell);
  }
  return route;
}

/** Shortens text to at most `max` characters, ending in an ellipsis. Counts by code point, so Thai and emoji are not cut mid character. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/** Roughly how many characters of a given font size fit in a width, both in view units. */
export function charsThatFit(width: number, fontSize: number): number {
  return Math.max(1, Math.floor(width / (fontSize * 0.6)));
}
