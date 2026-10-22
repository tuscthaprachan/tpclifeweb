import { describe, expect, it } from "vitest";

import {
  CELL,
  cellCentre,
  cellRect,
  cellShape,
  fromRightAngle,
  entrancePoint,
  gridExtent,
  hasFloorPlan,
  manhattan,
  nearestEntrance,
  planLayout,
  routeOrder,
  trianglePath,
  trianglePoints,
  truncate,
  walkingOrder,
} from "@/components/domain/canteen/map/geometry";

import { makeData } from "./fixture";

describe("map geometry", () => {
  const data = makeData();
  const settings = data.settings!;

  it("walking order is stall number, whatever the floor plan position", () => {
    const shuffled = [...data.stalls].reverse();
    expect(walkingOrder(shuffled).map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
    // Move stall 1 to the bottom row: a row-major order would put it last.
    const moved = shuffled.map((s) => (s.number === 1 ? { ...s, mapCell: { col: 0, row: 5, w: 1, h: 1 } } : s));
    expect(walkingOrder(moved).map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
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
    expect(entrancePoint({ col: 1, row: 0, side: "north" })).toEqual({ x: 1.5, y: 0 });
    expect(entrancePoint({ col: 0, row: 3, side: "south" })).toEqual({ x: 0.5, y: 4 });
    expect(entrancePoint({ col: 5, row: 2, side: "east" })).toEqual({ x: 6, y: 2.5 });
    expect(entrancePoint({ col: 0, row: 2, side: "west" })).toEqual({ x: 0, y: 2.5 });
  });

  it("puts an entrance on the wall of the cell it is in, so a wall can sit inside the grid", () => {
    expect(entrancePoint({ col: 6, row: 2, side: "north" })).toEqual({ x: 6.5, y: 2 });
    expect(entrancePoint({ col: 13, row: 11, side: "south" })).toEqual({ x: 13.5, y: 12 });
  });

  it("grows the grid for landmarks and outline corners", () => {
    const base = { gridCols: 4, gridRows: 4 };
    expect(gridExtent({ ...base, landmarks: [{ _key: "l", kind: "toilets", label: { th: "ห้องน้ำ", en: "Toilets" }, col: 6, row: 1, w: 1, h: 6 }] }, [])).toEqual({ cols: 7, rows: 7 });
    expect(gridExtent({ ...base, outline: [{ col: 1, row: 1 }, { col: 9, row: 1 }, { col: 9, row: 5 }] }, [])).toEqual({ cols: 9, rows: 5 });
  });

  it("leaves an entrance set in from the edge its own room, and only adds the shortfall", () => {
    const entrances = (row: number) => [{ _key: "n", label: { th: "ก", en: "N" }, col: 1, row, side: "north" as const }];
    const flush = planLayout({ gridCols: 4, gridRows: 4, entrances: entrances(0) }, []);
    const inset = planLayout({ gridCols: 4, gridRows: 4, entrances: entrances(2) }, []);
    expect(flush.margins.top).toBeGreaterThan(inset.margins.top);
    expect(inset.margins.top).toBe(inset.margins.bottom);
    expect(inset.height).toBe(inset.margins.top + 4 * CELL + inset.margins.bottom);
  });

  it("finds the nearest entrance by Manhattan distance, first wins a tie, none gives -1", () => {
    const entrances = [
      { col: 0, row: 0, side: "north" as const },
      { col: 5, row: 0, side: "north" as const },
    ];
    expect(nearestEntrance(entrances, { x: 5, y: 1 })).toBe(1);
    expect(nearestEntrance(entrances, { x: 3, y: 1 })).toBe(0);
    expect(nearestEntrance([], { x: 0, y: 0 })).toBe(-1);
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

describe("triangular cells", () => {
  const rect = { x: 100, y: 200, w: 140, h: 140 };

  it("treats anything but a known triangle as a rectangle", () => {
    expect(cellShape({})).toBe("rect");
    expect(cellShape({ shape: "triangleBottomLeft" })).toBe("triangleBottomLeft");
    expect(cellShape({ shape: "hexagon" as never })).toBe("rect");
    expect(trianglePoints(rect, "rect")).toBeNull();
    expect(trianglePath(rect, "rect")).toBeNull();
  });

  it("puts the right angle at the named corner, with the hypotenuse on the opposite diagonal", () => {
    expect(trianglePoints(rect, "triangleBottomRight")).toEqual([
      { x: 240, y: 340 },
      { x: 100, y: 340 },
      { x: 240, y: 200 },
    ]);
    expect(trianglePoints(rect, "triangleBottomLeft")).toEqual([
      { x: 100, y: 340 },
      { x: 240, y: 340 },
      { x: 100, y: 200 },
    ]);
  });

  it("grows by a fixed distance on every edge, keeping the corners sharp", () => {
    const [corner, base, side] = trianglePoints(rect, "triangleBottomRight", 4)!;
    expect(corner).toEqual({ x: 244, y: 344 });
    // The legs sit 4 units out, and the slanted edge (x + y = 440) 4 units out measured square to it.
    expect(base!.y).toBe(344);
    expect(side!.x).toBe(244);
    expect(base!.x + base!.y).toBeCloseTo(440 - 4 * Math.SQRT2);
    expect(side!.x + side!.y).toBeCloseTo(440 - 4 * Math.SQRT2);
    // Shrinking mirrors growing.
    expect(trianglePoints(rect, "triangleBottomRight", -4)![0]).toEqual({ x: 236, y: 336 });
  });

  it("writes a closed path", () => {
    expect(trianglePath(rect, "triangleBottomLeft")).toBe("M 100 340 L 240 340 L 100 200 Z");
  });

  it("measures positions in from the right angle, and has none for a rectangle", () => {
    expect(fromRightAngle(rect, "triangleBottomRight", 22, 16)).toEqual({ x: 218, y: 324 });
    expect(fromRightAngle(rect, "triangleBottomLeft", 22, 16)).toEqual({ x: 122, y: 324 });
    expect(fromRightAngle(rect, "rect", 22, 16)).toBeNull();
  });

  it("centres a triangle a third of the way in from the right angle", () => {
    expect(cellCentre({ col: 4, row: 0, w: 2, h: 2 })).toEqual({ x: 5, y: 1 });
    const right = cellCentre({ col: 4, row: 0, w: 2, h: 2, shape: "triangleBottomRight" });
    expect(right.x).toBeCloseTo(4 + 2 - 2 / 3);
    expect(right.y).toBeCloseTo(2 - 2 / 3);
    const left = cellCentre({ col: 8, row: 0, w: 2, h: 2, shape: "triangleBottomLeft" });
    expect(left.x).toBeCloseTo(8 + 2 / 3);
    expect(left.y).toBeCloseTo(2 - 2 / 3);
  });
});
