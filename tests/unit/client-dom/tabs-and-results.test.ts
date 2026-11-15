// @vitest-environment jsdom
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Tabs } from "@/components/ui/Tabs";
import { clampPage, LOST_FOUND_PAGE_SIZE } from "@/components/domain/lostfound/LostFoundResults";
import { render } from "../support/dom";

const item = (id: string) => ({ id, label: id.toUpperCase(), panel: `panel ${id}` });

function selected(host: HTMLElement): string | undefined {
  return host.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? undefined;
}

describe("Tabs", () => {
  it("falls back to the first tab when the active id disappears", async () => {
    const view = await render(createElement(Tabs, { items: [item("a"), item("b"), item("c")], label: "t", defaultTabId: "c" }));
    expect(selected(view.host)).toBe("C");
    await view.rerender(createElement(Tabs, { items: [item("a"), item("b")], label: "t", defaultTabId: "c" }));
    expect(selected(view.host)).toBe("A");
    expect(view.host.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    expect(view.host.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
  });

  it("keeps the active tab while it still exists", async () => {
    const view = await render(createElement(Tabs, { items: [item("a"), item("b")], label: "t", defaultTabId: "b" }));
    await view.rerender(createElement(Tabs, { items: [item("a"), item("b"), item("c")], label: "t", defaultTabId: "b" }));
    expect(selected(view.host)).toBe("B");
  });
});

describe("lost and found page clamp", () => {
  it("brings a page beyond the last back to the last", () => {
    expect(clampPage(9, 0)).toBe(1);
    expect(clampPage(9, LOST_FOUND_PAGE_SIZE)).toBe(1);
    expect(clampPage(9, LOST_FOUND_PAGE_SIZE + 1)).toBe(2);
    expect(clampPage(2, LOST_FOUND_PAGE_SIZE * 3)).toBe(2);
  });
});
