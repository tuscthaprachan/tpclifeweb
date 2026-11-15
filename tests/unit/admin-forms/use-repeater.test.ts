// @vitest-environment jsdom
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { useRepeater } from "@/components/admin/hooks/use-repeater";
import { RepeaterStatus } from "@/components/admin/content/RowButtons";
import { render, renderHook, step } from "../support/dom";

const options = { locale: "en" as const, itemLabel: "Stop" };

describe("useRepeater", () => {
  it("adds, removes and moves, calling onChange only for real changes", async () => {
    const onChange = vi.fn();
    const hook = await renderHook(() => useRepeater(["a", "b"], { ...options, max: 3, onChange }));
    await step(() => hook.current.add("c"));
    expect(hook.current.rows.map((r) => r.value)).toEqual(["a", "b", "c"]);
    expect(hook.current.canAdd).toBe(false);
    onChange.mockClear();
    await step(() => hook.current.add("d"));
    expect(onChange).not.toHaveBeenCalled();
    await step(() => hook.current.move(hook.current.rows[0]!.key, 1));
    expect(hook.current.rows.map((r) => r.value)).toEqual(["b", "a", "c"]);
    await step(() => hook.current.remove(hook.current.rows[1]!.key));
    expect(hook.current.rows.map((r) => r.value)).toEqual(["b", "c"]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("announces each change", async () => {
    const hook = await renderHook(() => useRepeater(["a", "b"], options));
    await step(() => hook.current.add("c"));
    expect(hook.current.message.value).toBe("Stop 3 added");
    await step(() => hook.current.remove(hook.current.rows[0]!.key));
    expect(hook.current.message.value).toBe("Stop 1 removed");
    await step(() => hook.current.move(hook.current.rows[0]!.key, 1));
    expect(hook.current.message.value).toBe("Stop moved to position 2 of 2");
  });
});

function Rows({ initial }: { initial: string[] }) {
  const list = useRepeater(initial, options);
  return createElement(
    "div",
    null,
    createElement(RepeaterStatus, { message: list.message }),
    createElement(
      "ul",
      null,
      list.rows.map((row, i) =>
        createElement(
          "li",
          { key: row.key, ref: list.rowRef(row.key) },
          createElement("input", { "aria-label": `row ${i}`, defaultValue: row.value }),
          createElement("button", { type: "button", "data-testid": `remove-${i}`, onClick: () => list.remove(row.key) }, "remove"),
        ),
      ),
    ),
    createElement("div", { ref: list.addRef }, createElement("button", { type: "button", id: "add", onClick: () => list.add("new") }, "add")),
  );
}

describe("repeater focus", () => {
  it("focuses the new row after Add", async () => {
    const view = await render(createElement(Rows, { initial: ["a"] }));
    await step(() => view.host.querySelector<HTMLButtonElement>("#add")!.click());
    const inputs = view.host.querySelectorAll("input");
    expect(inputs).toHaveLength(2);
    expect(document.activeElement).toBe(inputs[1]);
  });

  it("hands focus to the next row after Remove, then to Add when none is left", async () => {
    const view = await render(createElement(Rows, { initial: ["a", "b"] }));
    await step(() => view.host.querySelector<HTMLButtonElement>('[data-testid="remove-0"]')!.click());
    expect(document.activeElement).toBe(view.host.querySelector("input"));
    expect(view.host.querySelector("input")!.value).toBe("b");
    await step(() => view.host.querySelector<HTMLButtonElement>('[data-testid="remove-0"]')!.click());
    expect(view.host.querySelectorAll("input")).toHaveLength(0);
    expect(document.activeElement).toBe(view.host.querySelector("#add"));
  });

  it("keeps typed values with their row when another is removed", async () => {
    const view = await render(createElement(Rows, { initial: ["a", "b"] }));
    const second = view.host.querySelectorAll("input")[1]!;
    await step(() => {
      second.value = "typed";
    });
    await step(() => view.host.querySelector<HTMLButtonElement>('[data-testid="remove-0"]')!.click());
    expect(view.host.querySelector("input")!.value).toBe("typed");
    expect(view.host.querySelector('[role="status"]')!.textContent).toBe("Stop 1 removed");
  });
});
