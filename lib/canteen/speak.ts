/**
 * Reading a dish name aloud. `waitingForVoices` covers the moment after a tap
 * while the browser is still loading its voice list; `speaking` is an utterance
 * that has been queued. `ticket` counts taps, so a callback from an earlier tap
 * can be told apart from the current one and ignored.
 */
export type SpeakState =
  | { phase: "idle"; ticket: number }
  | { phase: "waitingForVoices"; ticket: number }
  | { phase: "speaking"; ticket: number };

export type SpeakEvent =
  | { type: "click"; voicesLoaded: boolean }
  | { type: "voicesReady"; ticket: number }
  | { type: "ended"; ticket: number }
  | { type: "stop" };

/** What the caller must do: `speak` queues the utterance, `wait` listens for voices, `none` does nothing. Every click also cancels speech already under way. */
export type SpeakAction = "speak" | "wait" | "none";

export const initialSpeak: SpeakState = { phase: "idle", ticket: 0 };

/** Pure transition. A new tap supersedes any wait or utterance; a late voices callback for an old tap does nothing. */
export function speakStep(state: SpeakState, event: SpeakEvent): { state: SpeakState; action: SpeakAction } {
  switch (event.type) {
    case "click": {
      const ticket = state.ticket + 1;
      return event.voicesLoaded
        ? { state: { phase: "speaking", ticket }, action: "speak" }
        : { state: { phase: "waitingForVoices", ticket }, action: "wait" };
    }
    case "voicesReady":
      return state.phase === "waitingForVoices" && state.ticket === event.ticket
        ? { state: { phase: "speaking", ticket: state.ticket }, action: "speak" }
        : { state, action: "none" };
    case "ended":
      return state.phase === "speaking" && state.ticket === event.ticket
        ? { state: { phase: "idle", ticket: state.ticket }, action: "none" }
        : { state, action: "none" };
    case "stop":
      return { state: { phase: "idle", ticket: state.ticket + 1 }, action: "none" };
  }
}
