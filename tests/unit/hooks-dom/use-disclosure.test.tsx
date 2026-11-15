// @vitest-environment jsdom
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { useDisclosure, type DisclosureOptions } from "@/components/layout/use-disclosure";
import { render, step } from "../support/dom";

function Menu({ options, closeOn }: { options?: DisclosureOptions; closeOn?: string }) {
  const d = useDisclosure({ ...options, closeOn });
  return createElement(
    "div",
    null,
    createElement(
      "details",
      { ref: d.detailsRef, onToggle: d.onToggle },
      createElement("summary", { ref: d.summaryRef, id: "summary", tabIndex: 0 }, "Menu"),
      createElement("a", { href: "#x", id: "link" }, "Link"),
      createElement("button", { id: "inside", type: "button" }, "Inside"),
      createElement("form", { id: "form", onSubmit: (e: { preventDefault: () => void }) => e.preventDefault() }, createElement("button", { type: "submit", id: "submit" }, "Go")),
    ),
    createElement("button", { id: "outside", type: "button" }, "Outside"),
    createElement("span", { id: "state" }, String(d.open)),
  );
}

const q = <T extends Element>(selector: string) => document.querySelector(selector) as T;

/** Opens the details as a user would and waits for the toggle to be handled. */
async function open() {
  await step(() => {
    const details = q<HTMLDetailsElement>("details");
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
  });
}

/** Mirrors the browser: closing the details fires toggle. */
async function closeToggle() {
  await step(() => q<HTMLDetailsElement>("details").dispatchEvent(new Event("toggle")));
}

describe("useDisclosure", () => {
  it("tracks open", async () => {
    await render(createElement(Menu));
    expect(q("#state").textContent).toBe("false");
    await open();
    expect(q("#state").textContent).toBe("true");
  });

  it("Escape closes and returns focus to the summary", async () => {
    await render(createElement(Menu));
    await open();
    q<HTMLElement>("#inside").focus();
    await step(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
    expect(document.activeElement).toBe(q("#summary"));
    await closeToggle();
    expect(q("#state").textContent).toBe("false");
  });

  it("other keys do nothing", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });

  it("a link click closes it", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => q<HTMLElement>("#link").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
  });

  it("a click on a non-link stays open", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => q<HTMLElement>("#inside").click());
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });

  it("submit closes only when enabled", async () => {
    await render(createElement(Menu, { options: { closeOnSubmit: true } }));
    await open();
    await step(() => q<HTMLFormElement>("#form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
  });

  it("submit leaves it open by default", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => q<HTMLFormElement>("#form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });

  it("outside pointer closes only when enabled", async () => {
    await render(createElement(Menu, { options: { closeOnOutsidePointer: true } }));
    await open();
    await step(() => q<HTMLElement>("#inside").dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
    await step(() => q<HTMLElement>("#outside").dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
  });

  it("outside pointer is ignored by default", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => q<HTMLElement>("#outside").dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });

  it("focus-out to outside closes only when enabled", async () => {
    await render(createElement(Menu, { options: { closeOnFocusOut: true } }));
    await open();
    await step(() => q<HTMLElement>("#link").dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: q("#inside") })));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
    await step(() => q<HTMLElement>("#link").dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: q("#outside") })));
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
  });

  it("focus-out is ignored by default", async () => {
    await render(createElement(Menu));
    await open();
    await step(() => q<HTMLElement>("#link").dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: q("#outside") })));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });

  it("closes when closeOn changes", async () => {
    const view = await render(createElement(Menu, { closeOn: "/a" }));
    await open();
    await view.rerender(createElement(Menu, { closeOn: "/b" }));
    expect(q<HTMLDetailsElement>("details").open).toBe(false);
  });

  it("stays open when closeOn is unchanged", async () => {
    const view = await render(createElement(Menu, { closeOn: "/a" }));
    await open();
    await view.rerender(createElement(Menu, { closeOn: "/a" }));
    expect(q<HTMLDetailsElement>("details").open).toBe(true);
  });
});
