// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStatusMessage } from "@/components/hooks/use-status-message";
import { renderHook, step } from "../support/dom";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useStatusMessage", () => {
  it("starts empty", async () => {
    const hook = await renderHook(() => useStatusMessage<string>());
    expect(hook.current.value).toBeNull();
    expect(hook.current.nonce).toBe(0);
  });

  it("shows, bumps the nonce on a repeat and clears", async () => {
    const hook = await renderHook(() => useStatusMessage<string>());
    await step(() => hook.current.show("a"));
    expect(hook.current.value).toBe("a");
    expect(hook.current.nonce).toBe(1);
    await step(() => hook.current.show("a"));
    expect(hook.current.nonce).toBe(2);
    await step(() => hook.current.clear());
    expect(hook.current.value).toBeNull();
  });

  it("never clears on its own without a delay", async () => {
    const hook = await renderHook(() => useStatusMessage<string>());
    await step(() => hook.current.show("a"));
    await step(() => vi.advanceTimersByTime(10 * 60_000));
    expect(hook.current.value).toBe("a");
  });

  it("clears after the delay", async () => {
    const hook = await renderHook(() => useStatusMessage<string>(1000));
    await step(() => hook.current.show("a"));
    await step(() => vi.advanceTimersByTime(999));
    expect(hook.current.value).toBe("a");
    await step(() => vi.advanceTimersByTime(1));
    expect(hook.current.value).toBeNull();
  });

  it("restarts the timer on every show", async () => {
    const hook = await renderHook(() => useStatusMessage<string>(1000));
    await step(() => hook.current.show("a"));
    await step(() => vi.advanceTimersByTime(800));
    await step(() => hook.current.show("b"));
    await step(() => vi.advanceTimersByTime(800));
    expect(hook.current.value).toBe("b");
    await step(() => vi.advanceTimersByTime(200));
    expect(hook.current.value).toBeNull();
  });

  it("clears the timer on unmount", async () => {
    const hook = await renderHook(() => useStatusMessage<string>(1000));
    await step(() => hook.current.show("a"));
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
