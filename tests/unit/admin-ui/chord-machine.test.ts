import { describe, expect, it } from "vitest";
import { chordOutcome, chordReducer, IDLE_CHORD, type ChordEvent, type ChordState } from "@/components/admin/shell/chord-machine";
import type { GoShortcut } from "@/lib/admin/shortcuts";

const shortcuts: GoShortcut[] = [{ key: "c", href: "/admin/cases", label: "Cases", icon: "cases" }];
const key = (k: string, now = 0, canStart = true): ChordEvent => ({ type: "key", key: k, now, canStart });
const run = (events: ChordEvent[], start: ChordState = IDLE_CHORD) => events.reduce(chordReducer, start);

describe("go chord", () => {
  it("starts on g and ends on the next key", () => {
    expect(run([key("g", 5)])).toEqual({ status: "awaiting", since: 5 });
    expect(run([key("g", 5), key("c", 6)])).toEqual(IDLE_CHORD);
  });

  it("does not start without shortcuts or on other keys", () => {
    expect(run([key("g", 5, false)])).toEqual(IDLE_CHORD);
    expect(run([key("x", 5)])).toEqual(IDLE_CHORD);
  });

  it("times out only the chord it was set for", () => {
    expect(run([{ type: "timeout", since: 5 }], { status: "awaiting", since: 5 })).toEqual(IDLE_CHORD);
    expect(run([{ type: "timeout", since: 5 }], { status: "awaiting", since: 9 })).toEqual({ status: "awaiting", since: 9 });
  });

  it("resets mid chord, so a re-run listener cannot leave the banner stuck", () => {
    expect(run([key("g", 5), { type: "reset" }])).toEqual(IDLE_CHORD);
  });

  it("resolves the outcome from the state before the key", () => {
    expect(chordOutcome(IDLE_CHORD, "g", shortcuts)).toEqual({ kind: "none" });
    expect(chordOutcome(IDLE_CHORD, "?", shortcuts)).toEqual({ kind: "help" });
    expect(chordOutcome({ status: "awaiting", since: 1 }, "C", shortcuts)).toEqual({ kind: "go", href: "/admin/cases" });
    expect(chordOutcome({ status: "awaiting", since: 1 }, "?", shortcuts)).toEqual({ kind: "none" });
  });
});
