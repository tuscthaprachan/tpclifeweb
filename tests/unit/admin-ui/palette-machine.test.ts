import { describe, expect, it } from "vitest";
import { fuzzyScore, initialRemote, remoteReducer, remoteView, type RemoteEvent, type RemoteResult, type RemoteState } from "@/components/admin/shell/palette-machine";

const result: RemoteResult = { id: "1", title: "Case", href: "/admin/cases/1", icon: "cases", group: "Cases" };
const run = (events: RemoteEvent[], start: RemoteState = initialRemote()) => events.reduce((s, e) => remoteReducer(s, e), start);

describe("palette remote search", () => {
  it("goes idle, loading, ok", () => {
    expect(run([{ type: "start", q: "ab" }])).toEqual({ status: "loading", q: "ab" });
    expect(run([{ type: "start", q: "ab" }, { type: "succeeded", q: "ab", results: [result] }])).toEqual({ status: "ok", q: "ab", results: [result] });
  });

  it("keeps a failure apart from no results", () => {
    const failed = run([{ type: "start", q: "ab" }, { type: "failed", q: "ab" }]);
    const empty = run([{ type: "start", q: "ab" }, { type: "succeeded", q: "ab", results: [] }]);
    expect(failed.status).toBe("error");
    expect(empty).toEqual({ status: "ok", q: "ab", results: [] });
    expect(remoteView(failed, "ab", true)).toEqual({ status: "error" });
    expect(remoteView(empty, "ab", true)).toEqual({ status: "ok", results: [] });
  });

  it("drops an answer for an old query", () => {
    const state = run([{ type: "start", q: "ab" }, { type: "start", q: "abc" }, { type: "succeeded", q: "ab", results: [result] }, { type: "failed", q: "ab" }]);
    expect(state).toEqual({ status: "loading", q: "abc" });
  });

  it("ignores an answer that arrives with nothing pending", () => {
    expect(run([{ type: "succeeded", q: "ab", results: [result] }])).toEqual({ status: "idle" });
  });

  it("resets to idle", () => {
    expect(run([{ type: "reset" }], { status: "error", q: "ab" })).toEqual({ status: "idle" });
  });

  it("views another query as loading, and short or disabled queries as idle", () => {
    expect(remoteView({ status: "error", q: "ab" }, "abc", true)).toEqual({ status: "loading" });
    expect(remoteView({ status: "ok", q: "ab", results: [] }, "a", true)).toEqual({ status: "idle" });
    expect(remoteView({ status: "ok", q: "ab", results: [] }, "ab", false)).toEqual({ status: "idle" });
    expect(remoteView(initialRemote(), "ab", true)).toEqual({ status: "loading" });
  });
});

describe("fuzzyScore", () => {
  it("scores everything for an empty query", () => {
    expect(fuzzyScore("  ", "Anything")).toBe(0);
  });

  it("ranks a prefix above a later substring", () => {
    expect(fuzzyScore("cas", "Cases")!).toBeGreaterThan(fuzzyScore("cas", "My cases")! - 1);
    expect(fuzzyScore("cas", "Cases")!).toBeGreaterThan(fuzzyScore("cas", "Browse all cases")!);
  });

  it("matches letters in order and rejects others", () => {
    expect(fuzzyScore("cse", "Cases")).not.toBeNull();
    expect(fuzzyScore("esc", "Cases")).toBeNull();
  });

  it("requires every word", () => {
    expect(fuzzyScore("add case", "Add a case")).not.toBeNull();
    expect(fuzzyScore("add zzz", "Add a case")).toBeNull();
  });
});
