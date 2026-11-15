// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { useUrlEcho, type UrlEcho } from "@/components/hooks/use-url-echo";
import { initialUrlEcho, isEditing, reduceUrlEcho } from "@/components/hooks/url-echo-machine";
import { renderHook, step } from "../support/dom";

describe("url echo machine", () => {
  it("synced: an unchanged URL changes nothing", () => {
    const state = initialUrlEcho("a=1");
    expect(reduceUrlEcho(state, { type: "url", key: "a=1" })).toBe(state);
  });

  it("synced to editing to synced: the echo of our own change is not external", () => {
    const editing = reduceUrlEcho(initialUrlEcho("a=1"), { type: "edit", key: "a=2", show: true });
    expect(editing).toEqual({ url: "a=1", shown: "a=2", pending: "a=2", generation: 0 });
    expect(isEditing(editing)).toBe(true);
    const synced = reduceUrlEcho(editing, { type: "url", key: "a=2" });
    expect(synced).toEqual({ url: "a=2", shown: "a=2", pending: null, generation: 0 });
  });

  it("an edit without show leaves what is shown alone", () => {
    const editing = reduceUrlEcho(initialUrlEcho("a=1"), { type: "edit", key: "a=2" });
    expect(editing.shown).toBe("a=1");
    expect(reduceUrlEcho(editing, { type: "url", key: "a=2" }).shown).toBe("a=1");
  });

  it("a URL that is not the one we set is external: shown follows and the generation moves", () => {
    const editing = reduceUrlEcho(initialUrlEcho("a=1"), { type: "edit", key: "a=2", show: true });
    expect(reduceUrlEcho(editing, { type: "url", key: "a=9" })).toEqual({ url: "a=9", shown: "a=9", pending: null, generation: 1 });
    expect(reduceUrlEcho(initialUrlEcho("a=1"), { type: "url", key: "a=3" })).toEqual({ url: "a=3", shown: "a=3", pending: null, generation: 1 });
  });

  it("an edit to the current URL starts nothing", () => {
    const state = initialUrlEcho("a=1");
    expect(reduceUrlEcho(state, { type: "edit", key: "a=1" })).toBe(state);
    expect(isEditing(reduceUrlEcho(state, { type: "edit", key: "a=1", show: true }))).toBe(false);
  });

  it("cancel stops waiting", () => {
    const editing = reduceUrlEcho(initialUrlEcho("a=1"), { type: "edit", key: "a=2" });
    expect(reduceUrlEcho(editing, { type: "cancel" }).pending).toBeNull();
  });
});

describe("useUrlEcho", () => {
  it("keeps shown and the generation through the echo of its own edit", async () => {
    const hook = await renderHook<UrlEcho, string>((key) => useUrlEcho(key), "a=1");
    await step(() => hook.current.edit("a=2", true));
    expect(hook.current.shown).toBe("a=2");
    expect(hook.current.editing).toBe(true);
    await hook.rerender("a=2");
    expect(hook.current.editing).toBe(false);
    expect(hook.current.generation).toBe(0);
    expect(hook.current.shown).toBe("a=2");
  });

  it("follows an external change and bumps the generation", async () => {
    const hook = await renderHook<UrlEcho, string>((key) => useUrlEcho(key), "a=1");
    await hook.rerender("a=5");
    expect(hook.current.shown).toBe("a=5");
    expect(hook.current.generation).toBe(1);
  });

  it("does not start for the current URL, and cancel ends a wait", async () => {
    const hook = await renderHook<UrlEcho, string>((key) => useUrlEcho(key), "/p?a=1");
    await step(() => hook.current.edit("/p?a=1"));
    expect(hook.current.editing).toBe(false);
    await step(() => hook.current.edit("/p?a=2"));
    expect(hook.current.editing).toBe(true);
    await step(() => hook.current.cancel());
    expect(hook.current.editing).toBe(false);
  });
});
