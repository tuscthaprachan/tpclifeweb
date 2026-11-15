import type { GoShortcut } from "@/lib/admin/shortcuts";

/** The "g then a letter" chord: waiting for the letter since a moment, or not. */
export type ChordState = { status: "idle" } | { status: "awaiting"; since: number };

export type ChordEvent = { type: "key"; key: string; now: number; canStart: boolean } | { type: "timeout"; since: number } | { type: "reset" };

export const IDLE_CHORD: ChordState = { status: "idle" };

/** Any key ends a chord in progress; "g" starts one when there is somewhere to go. A timeout only ends the chord it was set for. */
export function chordReducer(state: ChordState, event: ChordEvent): ChordState {
  switch (event.type) {
    case "key":
      if (state.status === "awaiting") return IDLE_CHORD;
      return event.key === "g" && event.canStart ? { status: "awaiting", since: event.now } : state;
    case "timeout":
      return state.status === "awaiting" && state.since === event.since ? IDLE_CHORD : state;
    case "reset":
      return state.status === "idle" ? state : IDLE_CHORD;
  }
}

/** What the key does, decided before the reducer moves on. */
export type ChordOutcome = { kind: "go"; href: string } | { kind: "help" } | { kind: "none" };

export function chordOutcome(state: ChordState, key: string, shortcuts: GoShortcut[]): ChordOutcome {
  if (state.status === "awaiting") {
    const hit = shortcuts.find((s) => s.key === key.toLowerCase());
    return hit ? { kind: "go", href: hit.href } : { kind: "none" };
  }
  return key === "?" ? { kind: "help" } : { kind: "none" };
}
