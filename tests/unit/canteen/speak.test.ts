import { describe, expect, it } from "vitest";

import { initialSpeak, speakStep, type SpeakEvent, type SpeakState } from "@/lib/canteen/speak";

function run(events: SpeakEvent[]) {
  let state: SpeakState = initialSpeak;
  const actions: string[] = [];
  for (const event of events) {
    const next = speakStep(state, event);
    state = next.state;
    actions.push(next.action);
  }
  return { state, actions };
}

describe("speakStep", () => {
  it("speaks at once when voices are loaded", () => {
    const { state, actions } = run([{ type: "click", voicesLoaded: true }]);
    expect(actions).toEqual(["speak"]);
    expect(state.phase).toBe("speaking");
  });

  it("waits for voices, then speaks once", () => {
    const { state, actions } = run([{ type: "click", voicesLoaded: false }, { type: "voicesReady", ticket: 1 }, { type: "voicesReady", ticket: 1 }]);
    expect(actions).toEqual(["wait", "speak", "none"]);
    expect(state.phase).toBe("speaking");
  });

  it("speaks only once when tapped twice while voices load", () => {
    const { actions } = run([
      { type: "click", voicesLoaded: false },
      { type: "click", voicesLoaded: false },
      { type: "voicesReady", ticket: 1 },
      { type: "voicesReady", ticket: 2 },
    ]);
    expect(actions).toEqual(["wait", "wait", "none", "speak"]);
  });

  it("ignores a pending wait after stop", () => {
    const { state, actions } = run([{ type: "click", voicesLoaded: false }, { type: "stop" }, { type: "voicesReady", ticket: 1 }]);
    expect(actions).toEqual(["wait", "none", "none"]);
    expect(state.phase).toBe("idle");
  });

  it("returns to idle when the current utterance ends, not an old one", () => {
    const { state } = run([{ type: "click", voicesLoaded: true }, { type: "click", voicesLoaded: true }, { type: "ended", ticket: 1 }]);
    expect(state.phase).toBe("speaking");
    expect(speakStep(state, { type: "ended", ticket: 2 }).state.phase).toBe("idle");
  });
});
