// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { useCeremony } from "@/components/admin/hooks/use-ceremony";
import { renderHook, step } from "../support/dom";

type K = "cancelled" | "server";

describe("useCeremony", () => {
  it("stays locked after success and calls onSuccess", async () => {
    const hook = await renderHook(() => useCeremony<K>());
    const onSuccess = vi.fn();
    await step(() => hook.current.run(async () => ({ ok: true }), onSuccess));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(hook.current.state.status).toBe("done");
    expect(hook.current.locked).toBe(true);
    expect(hook.current.failure).toBeNull();
  });

  it("ignores a second start while the first is running", async () => {
    const hook = await renderHook(() => useCeremony<K>());
    let release!: () => void;
    const task = vi.fn(() => new Promise<{ ok: true }>((r) => (release = () => r({ ok: true }))));
    const second = vi.fn(async () => ({ ok: true }) as const);
    let first!: Promise<void>;
    await step(() => {
      first = hook.current.run(task, vi.fn());
    });
    expect(hook.current.locked).toBe(true);
    await step(() => hook.current.run(second, vi.fn()));
    expect(second).not.toHaveBeenCalled();
    await step(async () => {
      release();
      await first;
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("ignores a start after success", async () => {
    const hook = await renderHook(() => useCeremony<K>());
    await step(() => hook.current.run(async () => ({ ok: true }), vi.fn()));
    const again = vi.fn(async () => ({ ok: true }) as const);
    await step(() => hook.current.run(again, vi.fn()));
    expect(again).not.toHaveBeenCalled();
  });

  it("unlocks on failure, exposes the key and allows a retry", async () => {
    const hook = await renderHook(() => useCeremony<K>());
    const onSuccess = vi.fn();
    await step(() => hook.current.run(async () => ({ ok: false, key: "server" }), onSuccess));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(hook.current.failure).toBe("server");
    expect(hook.current.locked).toBe(false);
    await step(() => hook.current.run(async () => ({ ok: true }), onSuccess));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(hook.current.failure).toBeNull();
  });

  it("reset clears a failure", async () => {
    const hook = await renderHook(() => useCeremony<K>());
    await step(() => hook.current.run(async () => ({ ok: false, key: "cancelled" }), vi.fn()));
    await step(() => hook.current.reset());
    expect(hook.current.state.status).toBe("idle");
    expect(hook.current.failure).toBeNull();
  });
});
