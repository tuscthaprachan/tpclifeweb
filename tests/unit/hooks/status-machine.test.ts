import { describe, expect, it } from "vitest";
import { initialStatus, statusReducer } from "@/components/hooks/status-machine";

describe("statusReducer", () => {
  it("bumps the nonce on every show, even for the same value", () => {
    const a = statusReducer(initialStatus<string>(), { type: "show", value: "copied" });
    const b = statusReducer(a, { type: "show", value: "copied" });
    expect(a).toEqual({ value: "copied", nonce: 1 });
    expect(b).toEqual({ value: "copied", nonce: 2 });
  });

  it("expires only the message the timer was set for", () => {
    const first = statusReducer(initialStatus<string>(), { type: "show", value: "a" });
    const second = statusReducer(first, { type: "show", value: "b" });
    expect(statusReducer(second, { type: "expire", nonce: first.nonce })).toBe(second);
    expect(statusReducer(second, { type: "expire", nonce: second.nonce })).toEqual({ value: null, nonce: 2 });
  });

  it("clears without changing the nonce and is a no-op when empty", () => {
    const shown = statusReducer(initialStatus<string>(), { type: "show", value: "a" });
    const cleared = statusReducer(shown, { type: "clear" });
    expect(cleared).toEqual({ value: null, nonce: 1 });
    expect(statusReducer(cleared, { type: "clear" })).toBe(cleared);
  });
});
