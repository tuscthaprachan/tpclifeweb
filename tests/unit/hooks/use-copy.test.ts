// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopy } from "@/components/hooks/use-copy";
import { renderHook, step, stubClipboard } from "../support/dom";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useCopy", () => {
  it("copies, re-announces a repeat and clears after the delay", async () => {
    const written = stubClipboard();
    const hook = await renderHook(() => useCopy(1000));
    await step(() => hook.current.copy("a"));
    expect(hook.current.value).toBe("copied");
    const first = hook.current.nonce;
    await step(() => hook.current.copy("a"));
    expect(hook.current.nonce).toBe(first + 1);
    expect(written).toEqual(["a", "a"]);
    await step(() => vi.advanceTimersByTime(1000));
    expect(hook.current.value).toBeNull();
  });

  it("reports a failed copy", async () => {
    stubClipboard(true);
    const hook = await renderHook(() => useCopy());
    expect(await step(() => hook.current.copy("x"))).toBe("failed");
    expect(hook.current.value).toBe("failed");
  });

  it("does not fire its timer after unmount", async () => {
    stubClipboard();
    const hook = await renderHook(() => useCopy(1000));
    await step(() => hook.current.copy("a"));
    hook.unmount();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });
});
