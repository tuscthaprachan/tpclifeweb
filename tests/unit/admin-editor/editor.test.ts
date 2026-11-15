// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ContentFormProvider } from "@/components/admin/content/context";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import type { RichTextDoc } from "@/lib/rich-text/types";

vi.mock("next/image", () => ({ default: (props: { src: string; alt: string }) => createElement("img", { src: props.src, alt: props.alt }) }));
vi.mock("@/app/admin/content/actions", () => ({ uploadImageAction: vi.fn() }));
vi.mock("@/components/admin/content/compress-image-browser", () => ({ compressInBrowser: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  class RO {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  document.elementFromPoint = () => null;
  Element.prototype.scrollIntoView = () => {};
  const dialog = HTMLDialogElement.prototype;
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  dialog.close = function close(this: HTMLDialogElement) {
    if (this.hasAttribute("open")) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    }
  };
});

const doc = (text: string): RichTextDoc => ({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text }] },
    { type: "calloutBox", attrs: { tone: "info", body: { th: "ก", en: "b" } } },
  ],
});

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      createElement(
        ContentFormProvider,
        { value: { locale: "en", errors: {}, pending: false, markDirty: () => {} } },
        createElement(
          "form",
          null,
          createElement(BilingualRichTextField, {
            name: "body",
            label: "Body",
            defaultValue: { th: doc("สวัสดี"), en: doc("Hello") },
            refs: { images: [], forms: [], storageConfigured: false },
          }),
        ),
      ),
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300));
  });
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const hidden = (h: HTMLElement, name: string) => h.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value;

describe("RichTextEditor", () => {
  it("renders icon toolbars with named, tooltipped buttons and posts JSON", async () => {
    const h = await mount();
    expect(h.querySelectorAll('[role="toolbar"]')).toHaveLength(2);
    const bold = h.querySelector<HTMLButtonElement>('button[aria-label^="Bold"]')!;
    expect(bold.title).toMatch(/^Bold \((Ctrl|Cmd)\+B\)$/);
    expect(bold.getAttribute("aria-pressed")).toBe("false");
    expect(JSON.parse(hidden(h, "body.en")).content[0].content[0].text).toBe("Hello");
    expect(h.querySelectorAll('[role="textbox"]')).toHaveLength(2);
  });

  it("shows a custom block card with icon buttons that name the block", async () => {
    const h = await mount();
    expect(h.querySelector('button[aria-label="Edit: Notice box"]')).not.toBeNull();
    expect(h.querySelector('button[aria-label="Remove: Notice box"]')).not.toBeNull();
    expect(h.querySelector('button[aria-label="Move up: Notice box"]')).not.toBeNull();
  });

  it("opens the Insert menu from the keyboard and closes it with Escape", async () => {
    const h = await mount();
    const trigger = h.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"][aria-label="Insert content"]')!;
    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const menu = h.querySelector('[role="menu"]')!;
    expect(menu).not.toBeNull();
    expect(menu.querySelectorAll('[role="menuitem"]').length).toBeGreaterThanOrEqual(10);
    expect(document.activeElement?.getAttribute("role")).toBe("menuitem");
    await act(async () => {
      document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(h.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("switches to Markdown and back, keeping the custom block", async () => {
    const h = await mount();
    const toggle = [...h.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].filter((b) => b.textContent === "Markdown").at(-1)!;
    await act(async () => {
      toggle.click();
      await new Promise((r) => setTimeout(r, 600));
    });
    const area = h.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(area.value).toBe('Hello\n\n::callout{tone="info" body.th="ก" body.en="b"}\n');
    expect(h.querySelector('[aria-hidden="true"].font-mono')?.textContent).toBe("1234");

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(area, "Changed **bold**\n\n::callout{tone=\"info\" body.th=\"ก\" body.en=\"b\"}\n");
      area.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
    });
    const posted = JSON.parse(hidden(h, "body.en"));
    expect(posted.content[0].content[1].marks).toEqual([{ type: "bold" }]);

    await act(async () => {
      setter.call(area, "::callout{tone=oops}");
      area.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(h.textContent).toContain("Cannot go back to Visual yet");
    const visual = [...h.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].filter((b) => b.textContent === "Visual").at(-1)!;
    await act(async () => {
      visual.click();
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(h.querySelector("textarea")).not.toBeNull();
    expect(h.textContent).toContain("Cannot go back to Visual yet");
    expect(JSON.parse(hidden(h, "body.en")).content[0].content[1].marks).toEqual([{ type: "bold" }]);
  });

  it("posts Markdown typed in the last 300 ms when the form is read straight away", async () => {
    const h = await mount();
    const toggle = [...h.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].filter((b) => b.textContent === "Markdown").at(-1)!;
    await act(async () => {
      toggle.click();
      await new Promise((r) => setTimeout(r, 600));
    });
    const area = h.querySelector<HTMLTextAreaElement>("textarea")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(area, "Quick **edit**\n");
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(JSON.parse(hidden(h, "body.en")).content[0].content[0].text).toBe("Hello");
    const form = h.querySelector("form")!;
    form.addEventListener("submit", (e) => e.preventDefault());
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const data = new FormData(form);
    const posted = JSON.parse(String(data.get("body.en")));
    expect(posted.content[0].content[0].text).toBe("Quick ");
    expect(posted.content[0].content[1].marks).toEqual([{ type: "bold" }]);
  });

  const button = (h: HTMLElement, label: string) => h.querySelector<HTMLButtonElement>(`button[aria-label^="${label}"]`)!;
  const key = (el: Element, init: KeyboardEventInit) => act(async () => void el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })));
  const fullScreen = (h: HTMLElement) => h.querySelector('[role="dialog"][aria-modal="true"]');
  const status = (h: HTMLElement) => [...h.querySelectorAll('[role="status"]')].map((n) => n.textContent).join("|");

  it("enters and leaves full screen: scroll lock, inert page, announcements", async () => {
    const h = await mount();
    const outside = document.createElement("p");
    document.body.append(outside);
    await act(async () => button(h, "Full screen").click());
    expect(fullScreen(h)).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(outside.hasAttribute("inert")).toBe(true);
    expect(fullScreen(h)!.closest("[inert]")).toBeNull();
    expect(status(h)).toContain("Full screen on");
    await act(async () => button(h, "Exit full screen").click());
    expect(fullScreen(h)).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
    expect(outside.hasAttribute("inert")).toBe(false);
    expect(status(h)).toContain("Full screen off");
    outside.remove();
  });

  it("opens find, closes it from the toolbar, and refocuses the query on Mod-Shift-F", async () => {
    const h = await mount();
    const find = button(h, "Find and replace");
    await act(async () => find.click());
    const query = h.querySelector<HTMLInputElement>('[role="search"] input')!;
    expect(query).not.toBeNull();
    expect(document.activeElement).toBe(query);
    const area = h.querySelector<HTMLElement>('[role="textbox"]')!;
    await act(async () => area.focus());
    expect(document.activeElement).not.toBe(query);
    await key(area, { key: "f", ctrlKey: true, shiftKey: true });
    expect(h.querySelectorAll('[role="search"]')).toHaveLength(1);
    expect(document.activeElement).toBe(query);
    await act(async () => find.click());
    expect(h.querySelector('[role="search"]')).toBeNull();
  });

  it("shows the match count and the replaced note together", async () => {
    const h = await mount();
    await act(async () => button(h, "Find and replace").click());
    const [query, replacement] = [...h.querySelectorAll<HTMLInputElement>('[role="search"] input')];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(query, "สวัสดี");
      query!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(h.querySelector('[role="search"]')!.textContent).toContain("1 of 1");
    await act(async () => {
      setter.call(replacement, "Bye");
      replacement!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button(h, "Replace all").click());
    const text = h.querySelector('[role="search"]')!.textContent!;
    expect(text).toContain("Replaced 1");
    expect(text).toContain("No matches");
  });

  it("opens the link dialog and closes it with Cancel", async () => {
    const h = await mount();
    await act(async () => button(h, "Link").click());
    expect(document.querySelector("dialog[open]")).not.toBeNull();
    const cancel = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find((b) => b.textContent === "Cancel")!;
    await act(async () => cancel.click());
    expect(document.querySelector("dialog[open]")).toBeNull();
  });

  it("closes only the top overlay on Escape: find, then full screen", async () => {
    const h = await mount();
    await act(async () => button(h, "Full screen").click());
    await act(async () => button(h, "Find and replace").click());
    await key(h.querySelector('[role="search"] input')!, { key: "Escape" });
    expect(h.querySelector('[role="search"]')).toBeNull();
    expect(fullScreen(h)).not.toBeNull();
    await key(fullScreen(h)!.querySelector('[role="textbox"]')!, { key: "Escape" });
    expect(fullScreen(h)).toBeNull();
  });

  it("keeps full screen when a dialog closes", async () => {
    const h = await mount();
    await act(async () => button(h, "Full screen").click());
    await act(async () => button(h, "Link").click());
    const dialog = document.querySelector("dialog[open]")!;
    await key(dialog.querySelector("input")!, { key: "Escape" });
    expect(fullScreen(h)).not.toBeNull();
    await act(async () => dialog.dispatchEvent(new Event("close")));
    expect(document.querySelector("dialog[open]")).toBeNull();
    expect(fullScreen(h)).not.toBeNull();
  });

  it("round trips Visual, Markdown and Visual again, closing find and announcing each mode", async () => {
    const h = await mount();
    await act(async () => button(h, "Find and replace").click());
    expect(h.querySelector('[role="search"]')).not.toBeNull();
    const toggle = (name: string) => [...h.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].filter((b) => b.textContent === name)[0]!;
    await act(async () => {
      toggle("Markdown").click();
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(h.querySelector('[role="search"]')).toBeNull();
    expect(status(h)).toContain("Markdown mode");
    await act(async () => {
      toggle("Visual").click();
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(h.querySelector("textarea")).toBeNull();
    expect(status(h)).toContain("Visual mode");
    expect(JSON.parse(hidden(h, "body.th")).content[0].content[0].text).toBe("สวัสดี");
    expect(h.querySelector('[role="search"]')).toBeNull();
  });
});
