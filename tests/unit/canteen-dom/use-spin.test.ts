// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SPIN_KEY, SPIN_PENDING_ID, SPIN_PENDING_SCRIPT, arm } from "@/components/domain/canteen/pick/spin-machine";
import { armSpin, useSpin } from "@/components/domain/canteen/pick/use-spin";
import { renderHook, step } from "../support/dom";

function go(href: string) {
  window.history.replaceState(null, "", href);
}

beforeEach(() => {
  window.sessionStorage.clear();
  document.getElementById(SPIN_PENDING_ID)?.remove();
  vi.useRealTimers();
  go("/en/eat/pick?seed=a");
});

describe("useSpin", () => {
  it("is idle on a fresh load, a reload or Back", async () => {
    const hook = await renderHook(() => useSpin("seed=a"));
    expect(hook.current.state.status).toBe("idle");
  });

  it("plays for a spin to this address, once, and consumes the flag", async () => {
    armSpin("/en/eat/pick?seed=a");
    const hook = await renderHook(() => useSpin("seed=a"));
    expect(hook.current.state.status).toBe("playing");
    expect(window.sessionStorage.getItem(SPIN_KEY)).toBeNull();
    await step(() => hook.current.done());
    expect(hook.current.state.status).toBe("settled");
    await hook.rerender(undefined);
    expect(hook.current.state.status).toBe("settled");
  });

  it("plays a second spin that lands on the same key", async () => {
    armSpin("/en/eat/pick?seed=a");
    const hook = await renderHook(() => useSpin("seed=a"));
    await step(() => hook.current.done());
    expect(hook.current.state.status).toBe("settled");
    await step(() => armSpin("/en/eat/pick?seed=a"));
    expect(hook.current.state.status).toBe("playing");
  });

  it("ignores a stale flag armed for another URL, and leaves it", async () => {
    armSpin("/en/eat/pick?seed=zzz");
    const hook = await renderHook(() => useSpin("seed=a"));
    expect(hook.current.state.status).toBe("idle");
    expect(window.sessionStorage.getItem(SPIN_KEY)).not.toBeNull();
  });

  it("drops an expired flag and does not play", async () => {
    window.sessionStorage.setItem(SPIN_KEY, JSON.stringify(arm("/en/eat/pick?seed=a", Date.now() - 60_000, "old")));
    const hook = await renderHook(() => useSpin("seed=a"));
    expect(hook.current.state.status).toBe("idle");
    expect(window.sessionStorage.getItem(SPIN_KEY)).toBeNull();
  });

  it("goes idle when the key changes without a spin (Back)", async () => {
    armSpin("/en/eat/pick?seed=a");
    const hook = await renderHook((key: string) => useSpin(key), "seed=a" as string);
    expect(hook.current.state.status).toBe("playing");
    go("/en/eat/pick?seed=b");
    await hook.rerender("seed=b");
    expect(hook.current.state.status).toBe("idle");
  });

  it("plays when the page lands on the armed key after navigation", async () => {
    const hook = await renderHook((key: string) => useSpin(key), "seed=a" as string);
    await step(() => armSpin("/en/eat/pick?seed=b"));
    expect(hook.current.state.status).toBe("idle");
    go("/en/eat/pick?seed=b");
    await hook.rerender("seed=b");
    expect(hook.current.state.status).toBe("playing");
  });
});

describe("SPIN_PENDING_SCRIPT", () => {
  function run(): boolean {
    new Function(SPIN_PENDING_SCRIPT)();
    return document.getElementById(SPIN_PENDING_ID) !== null;
  }
  const mql = (matches: boolean) => vi.stubGlobal("matchMedia", () => ({ matches }));

  it("hides only for a fresh claimed spin to this URL", () => {
    mql(false);
    expect(run()).toBe(false);
    armSpin("/en/eat/pick?seed=other");
    expect(run()).toBe(false);
    armSpin("/en/eat/pick?seed=a");
    expect(run()).toBe(true);
  });

  it("does not hide when stale or under reduced motion", () => {
    mql(false);
    window.sessionStorage.setItem(SPIN_KEY, JSON.stringify(arm("/en/eat/pick?seed=a", Date.now() - 60_000, "x")));
    expect(run()).toBe(false);
    mql(true);
    armSpin("/en/eat/pick?seed=a");
    expect(run()).toBe(false);
  });

  it("always unhides within 5 s", () => {
    mql(false);
    vi.useFakeTimers();
    armSpin("/en/eat/pick?seed=a");
    expect(run()).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(document.getElementById(SPIN_PENDING_ID)).toBeNull();
  });
});
