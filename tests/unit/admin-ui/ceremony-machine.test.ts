import { describe, expect, it } from "vitest";
import { ceremonyLocked, ceremonyReducer, initialCeremony, type CeremonyEvent, type CeremonyState } from "@/components/admin/hooks/ceremony-machine";

const run = (events: CeremonyEvent[], start: CeremonyState = initialCeremony()) => events.reduce(ceremonyReducer, start);

describe("passkey ceremony", () => {
  it("goes busy then failed with the key", () => {
    expect(run([{ type: "start" }])).toEqual({ status: "busy" });
    expect(run([{ type: "start" }, { type: "failed", key: "signInFailed" }])).toEqual({ status: "failed", key: "signInFailed" });
  });

  it("stays locked after success, so the button is not re-enabled during navigation", () => {
    const done = run([{ type: "start" }, { type: "succeeded" }]);
    expect(done).toEqual({ status: "done" });
    expect(ceremonyLocked(done)).toBe(true);
    expect(run([{ type: "start" }, { type: "reset" }], done)).toEqual({ status: "done" });
  });

  it("is locked only while busy or done", () => {
    expect(ceremonyLocked({ status: "idle" })).toBe(false);
    expect(ceremonyLocked({ status: "busy" })).toBe(true);
    expect(ceremonyLocked({ status: "failed", key: "x" })).toBe(false);
  });

  it("ignores a second start while busy", () => {
    expect(run([{ type: "start" }, { type: "start" }, { type: "failed", key: "k" }])).toEqual({ status: "failed", key: "k" });
  });

  it("allows a retry after a failure and clears it on reset", () => {
    const failed: CeremonyState = { status: "failed", key: "k" };
    expect(run([{ type: "start" }], failed)).toEqual({ status: "busy" });
    expect(run([{ type: "reset" }], failed)).toEqual({ status: "idle" });
  });

  it("ignores results with nothing running", () => {
    expect(run([{ type: "succeeded" }])).toEqual({ status: "idle" });
    expect(run([{ type: "failed", key: "k" }])).toEqual({ status: "idle" });
  });
});
