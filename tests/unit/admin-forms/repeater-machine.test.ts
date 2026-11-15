import { describe, expect, it } from "vitest";
import { initialRepeater, repeaterReducer } from "@/components/admin/hooks/repeater-machine";

const start = () => initialRepeater(["a", "b", "c"]);
const values = (s: ReturnType<typeof start>) => s.rows.map((r) => r.value);

describe("repeaterReducer", () => {
  it("keys the starting rows 0..n-1", () => {
    expect(start().rows.map((r) => r.key)).toEqual([0, 1, 2]);
  });

  it("add appends with a fresh key and focuses the new row", () => {
    const s = repeaterReducer(start(), { type: "add", value: "d" });
    expect(values(s)).toEqual(["a", "b", "c", "d"]);
    expect(s.last).toMatchObject({ kind: "add", key: 3, index: 3, focus: { target: "row", key: 3 } });
  });

  it("add is ignored at max", () => {
    const s = start();
    expect(repeaterReducer(s, { type: "add", value: "d", max: 3 })).toBe(s);
  });

  it("never reuses a key after a remove", () => {
    let s = repeaterReducer(start(), { type: "remove", key: 2 });
    s = repeaterReducer(s, { type: "add", value: "x" });
    expect(s.rows.map((r) => r.key)).toEqual([0, 1, 3]);
  });

  it("remove hands focus to the row that took its place", () => {
    const s = repeaterReducer(start(), { type: "remove", key: 1 });
    expect(values(s)).toEqual(["a", "c"]);
    expect(s.last).toMatchObject({ kind: "remove", index: 1, focus: { target: "row", key: 2 } });
  });

  it("removing the last row focuses the one before", () => {
    const s = repeaterReducer(start(), { type: "remove", key: 2 });
    expect(s.last?.focus).toEqual({ target: "row", key: 1 });
  });

  it("removing the only row focuses the Add button", () => {
    const s = repeaterReducer(initialRepeater(["a"]), { type: "remove", key: 0 });
    expect(s.rows).toEqual([]);
    expect(s.last?.focus).toEqual({ target: "add" });
  });

  it("move swaps with a neighbour and reports the new position", () => {
    const s = repeaterReducer(start(), { type: "move", key: 0, by: 1 });
    expect(values(s)).toEqual(["b", "a", "c"]);
    expect(s.last).toMatchObject({ kind: "move", index: 1, total: 3, by: 1 });
  });

  it("move at the ends and unknown keys change nothing", () => {
    const s = start();
    expect(repeaterReducer(s, { type: "move", key: 0, by: -1 })).toBe(s);
    expect(repeaterReducer(s, { type: "move", key: 2, by: 1 })).toBe(s);
    expect(repeaterReducer(s, { type: "move", key: 9, by: 1 })).toBe(s);
    expect(repeaterReducer(s, { type: "remove", key: 9 })).toBe(s);
  });

  it("serial grows with every change", () => {
    let s = repeaterReducer(start(), { type: "add", value: "d" });
    const first = s.last!.serial;
    s = repeaterReducer(s, { type: "remove", key: 3 });
    expect(s.last!.serial).toBe(first + 1);
  });
});
