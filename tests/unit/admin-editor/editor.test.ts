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
        createElement(BilingualRichTextField, {
          name: "body",
          label: "Body",
          defaultValue: { th: doc("สวัสดี"), en: doc("Hello") },
          refs: { images: [], forms: [], storageConfigured: false },
        }),
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
});
