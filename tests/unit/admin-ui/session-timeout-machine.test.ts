import { describe, expect, it } from "vitest";
import { formatRemaining, initialSessionTimeout, sessionDialogOpen, sessionTimeoutReducer, type SessionTimeoutEvent } from "@/components/admin/hooks/session-timeout-machine";

const WARN = 120_000;
const END = 1_000_000;
const reduce = (events: SessionTimeoutEvent[], now = END - 10 * WARN) => events.reduce((s, e) => sessionTimeoutReducer(s, e, WARN), initialSessionTimeout(END, now, WARN));

describe("session timeout", () => {
  it("idles, warns two minutes before the end, then expires", () => {
    expect(reduce([]).phase).toBe("idle");
    expect(reduce([{ type: "tick", now: END - WARN }]).phase).toBe("warning");
    expect(reduce([{ type: "tick", now: END }]).phase).toBe("expired");
  });

  it("starts in the right phase when loaded late", () => {
    expect(initialSessionTimeout(END, END - 1000, WARN).phase).toBe("warning");
    expect(initialSessionTimeout(END, END + 1, WARN).phase).toBe("expired");
  });

  it("shows the dialog while warning or extending only", () => {
    expect(sessionDialogOpen(reduce([{ type: "tick", now: END - WARN }]))).toBe(true);
    expect(sessionDialogOpen(reduce([{ type: "tick", now: END - WARN }, { type: "extend" }]))).toBe(true);
    expect(sessionDialogOpen(reduce([]))).toBe(false);
    expect(sessionDialogOpen(reduce([{ type: "tick", now: END }]))).toBe(false);
  });

  it("holds extending through ticks and returns to idle with a later end", () => {
    const s = reduce([{ type: "tick", now: END - 1000 }, { type: "extend" }, { type: "tick", now: END - 500 }]);
    expect(s.phase).toBe("extending");
    const next = reduce([{ type: "tick", now: END - 1000 }, { type: "extend" }, { type: "extended", endsAt: END + 30 * 60_000, now: END - 900 }]);
    expect(next.phase).toBe("idle");
    expect(next.endsAt).toBe(END + 30 * 60_000);
  });

  it("expires if the time runs out while extending", () => {
    expect(reduce([{ type: "tick", now: END - 1000 }, { type: "extend" }, { type: "tick", now: END + 1 }]).phase).toBe("expired");
  });

  it("expires when the server refuses or the call fails", () => {
    expect(reduce([{ type: "tick", now: END - 1000 }, { type: "extend" }, { type: "extendFailed" }]).phase).toBe("expired");
  });

  it("is final once expired, so the redirect fires once", () => {
    const expired = reduce([{ type: "tick", now: END }]);
    const later = [{ type: "tick", now: END + 5000 }, { type: "extended", endsAt: END + 99999, now: END + 5000 }, { type: "extend" }] as SessionTimeoutEvent[];
    const after = later.reduce((s, e) => sessionTimeoutReducer(s, e, WARN), expired);
    expect(after).toBe(expired);
  });
});

describe("formatRemaining", () => {
  it("says minutes from two", () => {
    expect(formatRemaining(120_000, "en")).toBe("2 minutes");
    expect(formatRemaining(90_000 + 30_000, "en")).toBe("2 minutes");
  });

  it("says a minute and seconds", () => {
    expect(formatRemaining(60_000, "en")).toBe("1 minute");
    expect(formatRemaining(75_000, "en")).toBe("1 minute 15 seconds");
  });

  it("says seconds, rounding up and never below zero", () => {
    expect(formatRemaining(1_200, "en")).toBe("2 seconds");
    expect(formatRemaining(-5, "en")).toBe("0 seconds");
  });

  it("is in Thai too", () => {
    expect(formatRemaining(30_000, "th")).not.toBe(formatRemaining(30_000, "en"));
  });
});
