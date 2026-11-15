// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShuttleStatus } from "@/components/domain/shuttle/useShuttleStatus";
import type { ShuttleRoute } from "@/lib/content/types";
import { renderHook, step } from "../support/dom";

const route = {
  _id: "r",
  _type: "shuttleRoute",
  _createdAt: "2026-01-01T00:00:00.000Z",
  _updatedAt: "2026-01-01T00:00:00.000Z",
  name: { th: "ก", en: "A" },
  slug: { current: "a" },
  stops: [{ _key: "o", name: { th: "ก", en: "A" }, offsetMinutes: 0 }],
  calendar: { daysOfWeek: [1, 2, 3, 4, 5] },
  departures: ["08:00", "08:30"],
  isActive: true,
} as unknown as ShuttleRoute;

const SERVER = "2026-08-10T08:00:00+07:00";

function stubMatchMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }),
  });
}

const firstStop = (status: ReturnType<typeof useShuttleStatus>["status"]) => (status.kind === "running" ? status.departures[0]?.stopTime : status.kind);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-10T08:00:30+07:00"));
});
afterEach(() => vi.useRealTimers());

describe("useShuttleStatus", () => {
  it("renders the server's instant first", async () => {
    stubMatchMedia(true);
    const hook = await renderHook(() => useShuttleStatus(route, SERVER));
    expect(hook.current.now.toISOString()).toBe(new Date(SERVER).toISOString());
  });

  it("advances on the minute", async () => {
    stubMatchMedia(false);
    const hook = await renderHook(() => useShuttleStatus(route, SERVER));
    await step(() => vi.advanceTimersByTime(0));
    expect(hook.current.now.getTime()).toBe(new Date("2026-08-10T08:00:30+07:00").getTime());
    expect(firstStop(hook.current.status)).toBe("08:00");
    await step(() => vi.advanceTimersByTime(30_000));
    expect(hook.current.now.getTime()).toBe(new Date("2026-08-10T08:01:00+07:00").getTime());
    expect(firstStop(hook.current.status)).toBe("08:30");
    await step(() => vi.advanceTimersByTime(60_000));
    expect(hook.current.now.getTime()).toBe(new Date("2026-08-10T08:02:00+07:00").getTime());
  });

  it("finishes for the day once the last departure has left", async () => {
    stubMatchMedia(false);
    vi.setSystemTime(new Date("2026-08-10T08:30:30+07:00"));
    const hook = await renderHook(() => useShuttleStatus(route, SERVER));
    await step(() => vi.advanceTimersByTime(0));
    expect(hook.current.status.kind).toBe("running");
    await step(() => vi.advanceTimersByTime(30_000));
    expect(hook.current.status.kind).toBe("finishedForToday");
  });

  it("stops under reduced motion", async () => {
    stubMatchMedia(true);
    const hook = await renderHook(() => useShuttleStatus(route, SERVER));
    await step(() => vi.advanceTimersByTime(5 * 60_000));
    expect(hook.current.now.toISOString()).toBe(new Date(SERVER).toISOString());
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer on unmount", async () => {
    stubMatchMedia(false);
    const hook = await renderHook(() => useShuttleStatus(route, SERVER));
    await step(() => vi.advanceTimersByTime(0));
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
