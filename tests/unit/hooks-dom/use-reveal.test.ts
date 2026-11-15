// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReveal } from "@/components/admin/hooks/use-reveal";
import { renderHook, step } from "../support/dom";

type S = { value?: string; error?: string };

const select = (s: S) => (s.value !== undefined ? { value: s.value } : s.error !== undefined ? { error: s.error } : null);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("useReveal", () => {
  it("shows the value the action returns", async () => {
    const action = vi.fn(async () => ({ value: "secret" }));
    const hook = await renderHook(() => useReveal<S, string>({ action, initial: {}, select }));
    await step(() => hook.current.reveal(new FormData()));
    expect(hook.current.state).toEqual({ status: "shown", value: "secret" });
    expect(action).toHaveBeenCalledWith({}, expect.any(FormData));
  });

  it("is pending while the action runs", async () => {
    const d = deferred<S>();
    const hook = await renderHook(() => useReveal<S, string>({ action: () => d.promise, initial: {}, select }));
    let p!: Promise<void>;
    await step(() => {
      p = hook.current.reveal(new FormData());
    });
    expect(hook.current.pending).toBe(true);
    await step(async () => {
      d.resolve({ value: "v" });
      await p;
    });
    expect(hook.current.pending).toBe(false);
  });

  it("hide drops the value and the next reveal runs the action again", async () => {
    const action = vi.fn(async () => ({ value: "secret" }));
    const hook = await renderHook(() => useReveal<S, string>({ action, initial: {}, select }));
    await step(() => hook.current.reveal(new FormData()));
    await step(() => hook.current.hide());
    expect(hook.current.state).toEqual({ status: "hidden" });
    await step(() => hook.current.reveal(new FormData()));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("auto-hides after the delay", async () => {
    const hook = await renderHook(() => useReveal<S, string>({ action: async () => ({ value: "v" }), initial: {}, select, autoHideMs: 5000 }));
    await step(() => hook.current.reveal(new FormData()));
    await step(() => vi.advanceTimersByTime(4999));
    expect(hook.current.state.status).toBe("shown");
    await step(() => vi.advanceTimersByTime(1));
    expect(hook.current.state).toEqual({ status: "hidden" });
  });

  it("does not auto-hide when the delay is zero", async () => {
    const hook = await renderHook(() => useReveal<S, string>({ action: async () => ({ value: "v" }), initial: {}, select, autoHideMs: 0 }));
    await step(() => hook.current.reveal(new FormData()));
    await step(() => vi.advanceTimersByTime(60 * 60_000));
    expect(hook.current.state.status).toBe("shown");
  });

  it("ignores an answer that arrives after hide", async () => {
    const d = deferred<S>();
    const hook = await renderHook(() => useReveal<S, string>({ action: () => d.promise, initial: {}, select }));
    let p!: Promise<void>;
    await step(() => {
      p = hook.current.reveal(new FormData());
    });
    await step(() => hook.current.hide());
    await step(async () => {
      d.resolve({ value: "late" });
      await p;
    });
    expect(hook.current.state).toEqual({ status: "hidden" });
  });

  it("ignores an older answer when a newer reveal has started", async () => {
    const first = deferred<S>();
    const second = deferred<S>();
    const queue = [first, second];
    const hook = await renderHook(() => useReveal<S, string>({ action: () => queue.shift()!.promise, initial: {}, select }));
    let p1!: Promise<void>;
    let p2!: Promise<void>;
    await step(() => {
      p1 = hook.current.reveal(new FormData());
    });
    await step(() => {
      p2 = hook.current.reveal(new FormData());
    });
    await step(async () => {
      second.resolve({ value: "new" });
      await p2;
    });
    await step(async () => {
      first.resolve({ value: "old" });
      await p1;
    });
    expect(hook.current.state).toEqual({ status: "shown", value: "new" });
  });

  it("shows the error the action reports", async () => {
    const hook = await renderHook(() => useReveal<S, string>({ action: async () => ({ error: "nope" }), initial: {}, select }));
    await step(() => hook.current.reveal(new FormData()));
    expect(hook.current.state).toEqual({ status: "error", message: "nope" });
  });

  it("shows the failure message when the action throws", async () => {
    const hook = await renderHook(() =>
      useReveal<S, string>({
        action: async () => {
          throw new Error("boom");
        },
        initial: {},
        select,
        failureMessage: "failed",
      }),
    );
    await step(() => hook.current.reveal(new FormData()));
    expect(hook.current.state).toEqual({ status: "error", message: "failed" });
  });

  it("hides when the action throws and there is no failure message", async () => {
    const hook = await renderHook(() =>
      useReveal<S, string>({
        action: async () => {
          throw new Error("boom");
        },
        initial: {},
        select,
      }),
    );
    await step(() => hook.current.reveal(new FormData()));
    expect(hook.current.state).toEqual({ status: "hidden" });
  });

  it("hides when the state carries neither value nor error", async () => {
    const hook = await renderHook(() => useReveal<S, string>({ action: async () => ({}), initial: {}, select }));
    await step(() => hook.current.reveal(new FormData()));
    expect(hook.current.state).toEqual({ status: "hidden" });
  });
});
