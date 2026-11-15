import { describe, expect, it } from "vitest";
import { initialReveal, outcomeEvent, REVEAL_AUTO_HIDE_MS, revealReducer, type RevealEvent, type RevealState } from "@/components/admin/hooks/reveal-machine";

const run = (events: RevealEvent<string>[], start: RevealState<string> = initialReveal<string>()) => events.reduce(revealReducer, start);

describe("reveal machine", () => {
  it("hidden, revealing, shown", () => {
    expect(run([{ type: "request" }])).toEqual({ status: "revealing" });
    expect(run([{ type: "request" }, { type: "resolved", value: "secret" }])).toEqual({ status: "shown", value: "secret" });
  });

  it("drops the value on hide", () => {
    const hidden = run([{ type: "request" }, { type: "resolved", value: "secret" }, { type: "hide" }]);
    expect(hidden).toEqual({ status: "hidden" });
    expect(JSON.stringify(hidden)).not.toContain("secret");
  });

  it("runs the logged action again after hide", () => {
    expect(run([{ type: "request" }, { type: "resolved", value: "a" }, { type: "hide" }, { type: "request" }])).toEqual({ status: "revealing" });
  });

  it("does not re-request while shown or revealing", () => {
    expect(run([{ type: "request" }], { status: "shown", value: "a" })).toEqual({ status: "shown", value: "a" });
    expect(run([{ type: "request" }], { status: "revealing" })).toEqual({ status: "revealing" });
  });

  it("keeps a failure and allows another try", () => {
    const failed = run([{ type: "request" }, { type: "failed", message: "no" }]);
    expect(failed).toEqual({ status: "error", message: "no" });
    expect(revealReducer(failed, { type: "request" })).toEqual({ status: "revealing" });
  });

  it("ignores answers with no request in flight", () => {
    expect(run([{ type: "resolved", value: "a" }])).toEqual({ status: "hidden" });
    expect(run([{ type: "failed", message: "x" }], { status: "shown", value: "a" })).toEqual({ status: "shown", value: "a" });
  });

  it("maps an action outcome to an event", () => {
    expect(outcomeEvent<string>({ value: "v" })).toEqual({ type: "resolved", value: "v" });
    expect(outcomeEvent<string>({ error: "e" })).toEqual({ type: "failed", message: "e" });
    expect(outcomeEvent<string>(null)).toEqual({ type: "hide" });
  });

  it("auto-hides after two minutes", () => {
    expect(REVEAL_AUTO_HIDE_MS).toBe(120000);
  });
});
