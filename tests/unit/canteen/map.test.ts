import { describe, expect, it } from "vitest";

import {
  CELL,
  cellCentre,
  cellRect,
  entrancePoint,
  gridExtent,
  hasFloorPlan,
  manhattan,
  nearestEntrance,
  planLayout,
  routeOrder,
  truncate,
  walkingOrder,
} from "@/components/domain/canteen/map/geometry";

import { makeData } from "./fixture";

describe("map geometry", () => {
  const data = makeData();
  const settings = data.settings!;

  it("walking order is row, then column, then number", () => {
    const shuffled = [...data.stalls].reverse();
    expect(walkingOrder(shuffled).map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("converts a cell to a rect inside the margins", () => {
    const layout = planLayout(settings, data.stalls);
    const rect = cellRect({ col: 2, row: 1, w: 2, h: 1 }, layout, 2);
    expect(rect).toEqual({ x: layout.margins.left + 2 * CELL + 2, y: layout.margins.top + CELL + 2, w: 2 * CELL - 4, h: CELL - 4 });
  });

  it("makes room for entrances and the river only on their sides", () => {
    const layout = planLayout(settings, data.stalls);
    expect(layout.margins.top).toBeGreaterThan(layout.margins.bottom);
    expect(layout.margins.right).toBeGreaterThan(layout.margins.left);
    expect(layout.width).toBe(layout.margins.left + 6 * CELL + layout.margins.right);
    const compact = planLayout(settings, data.stalls, { compact: true });
    expect(compact.margins.top).toBe(compact.margins.bottom);
  });

  it("grows the grid to hold a stall outside it, and caps it", () => {
    expect(gridExtent({ gridCols: 2, gridRows: 2 }, [{ mapCell: { col: 5, row: 0, w: 2, h: 1 } }])).toEqual({ cols: 7, rows: 2 });
    expect(gridExtent({ gridCols: 9999, gridRows: Number.NaN }, [])).toEqual({ cols: 40, rows: 1 });
  });

  it("places entrances on the edge of their side", () => {
    expect(entrancePoint({ col: 1, row: 0, side: "north" }, 6, 4)).toEqual({ x: 1.5, y: 0 });
    expect(entrancePoint({ col: 0, row: 3, side: "south" }, 6, 4)).toEqual({ x: 0.5, y: 4 });
    expect(entrancePoint({ col: 0, row: 2, side: "east" }, 6, 4)).toEqual({ x: 6, y: 2.5 });
    expect(entrancePoint({ col: 0, row: 2, side: "west" }, 6, 4)).toEqual({ x: 0, y: 2.5 });
  });

  it("finds the nearest entrance by Manhattan distance, first wins a tie, none gives -1", () => {
    const entrances = [
      { col: 0, row: 0, side: "north" as const },
      { col: 5, row: 0, side: "north" as const },
    ];
    expect(nearestEntrance(entrances, { x: 5, y: 1 }, 6, 4)).toBe(1);
    expect(nearestEntrance(entrances, { x: 3, y: 1 }, 6, 4)).toBe(0);
    expect(nearestEntrance([], { x: 0, y: 0 }, 6, 4)).toBe(-1);
  });

  it("orders a route by nearest next stop from the entrance", () => {
    const [s1, s2, , s4, , s6] = data.stalls;
    expect(manhattan(cellCentre(s1!.mapCell), cellCentre(s2!.mapCell))).toBe(2);
    // From the top left, then always the closest unvisited stall.
    const route = routeOrder([s6!, s4!, s2!], { x: 0, y: 0 });
    expect(route.map((s) => s.number)).toEqual([2, 4, 6]);
    // From the bottom right it starts at stall 6; stalls 2 and 4 are then equally far, and walking order breaks the tie.
    const back = routeOrder([s6!, s4!, s2!], { x: 6, y: 4 });
    expect(back.map((s) => s.number)).toEqual([6, 2, 4]);
    expect(routeOrder([], { x: 0, y: 0 })).toEqual([]);
  });

  it("is deterministic when two stalls are equally close", () => {
    const [s1, , s3] = data.stalls;
    const route = routeOrder([s3!, s1!], { x: 3, y: 0.5 });
    expect(route.map((s) => s.number)).toEqual([1, 3]);
  });

  it("needs settings, stalls and a grid to draw a plan", () => {
    expect(hasFloorPlan(settings, data.stalls)).toBe(true);
    expect(hasFloorPlan(null, data.stalls)).toBe(false);
    expect(hasFloorPlan(settings, [])).toBe(false);
    expect(hasFloorPlan({ ...settings, gridCols: 0 }, data.stalls)).toBe(false);
  });

  it("truncates by code point with an ellipsis", () => {
    expect(truncate("abc", 5)).toBe("abc");
    expect(truncate("abcdefgh", 5)).toBe("abcd…");
    expect(Array.from(truncate("😀😀😀😀😀😀", 3))).toHaveLength(3);
  });
});
