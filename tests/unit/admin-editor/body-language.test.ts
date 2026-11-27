// @vitest-environment jsdom
import { createElement, useEffect, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ContentFormProvider } from "@/components/admin/content/context";
import { DocumentLanguageProvider } from "@/components/admin/content/document-language";
import { restoreEntries } from "@/components/admin/content/form/edit-stash";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import type { Locale } from "@/lib/i18n/config";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { render, step } from "../support/dom";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/app/admin/content/actions", () => ({ uploadImageAction: vi.fn() }));
vi.mock("@/components/admin/content/compress-image-browser", () => ({ compressInBrowser: vi.fn() }));

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class ResizeObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  });
});

const doc = (text: string): RichTextDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

function BodyForm({ restored }: { restored?: RichTextDoc }) {
  const [language, setLanguage] = useState<Locale>("th");
  const [form, setForm] = useState<HTMLFormElement | null>(null);

  useEffect(() => {
    if (restored && form) restoreEntries(form, [["body.en", JSON.stringify(restored)]]);
  }, [form, restored]);

  return createElement(
    ContentFormProvider,
    { value: { locale: "en", errors: { "body.en": "Check the English text" }, pending: false, markDirty: () => {} } },
    createElement(
      DocumentLanguageProvider,
      { value: { language, setLanguage } },
      createElement("button", { type: "button", onClick: () => setLanguage("th") }, "Thai"),
      createElement("button", { type: "button", onClick: () => setLanguage("en") }, "English"),
      createElement("form", { ref: setForm }, createElement(BilingualRichTextField, {
        name: "body",
        label: "Body",
        refs: { images: [], forms: [], storageConfigured: false },
        defaultValue: { th: doc("ภาษาไทย"), en: doc("English text") },
      })),
    ),
  );
}

const button = (root: HTMLElement, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((el) => el.textContent === label)!;

describe("bilingual document body", () => {
  it("keeps both drafts mounted and targets the active Markdown control after switching languages", async () => {
    const { host } = await render(createElement(BodyForm, {}));
    const english = host.querySelector<HTMLElement>('[data-content-language="en"]')!;
    const thai = host.querySelector<HTMLElement>('[data-content-language="th"]')!;
    expect(english.hidden).toBe(true);
    expect(thai.hidden).toBe(false);

    await step(() => button(host, "English").click());
    expect(english.hidden).toBe(false);
    expect(thai.hidden).toBe(true);
    expect(english.querySelector("#f-body-en")?.getAttribute("role")).toBe("textbox");

    await step(async () => {
      button(english, "Markdown").click();
      await vi.dynamicImportSettled();
    });
    expect(english.querySelector("textarea")).toBeInstanceOf(HTMLTextAreaElement);
    const markdown = english.querySelector("textarea")!;
    expect(markdown.id).toBe("f-body-en");
    expect(markdown.getAttribute("aria-invalid")).toBe("true");
    expect(markdown.getAttribute("aria-describedby")).toContain("f-body-en-error");

    await step(() => button(host, "Thai").click());
    await step(() => button(host, "English").click());
    expect(english.querySelector("textarea")).toBe(markdown);
    expect(markdown.value).toContain("English text");
    const data = new FormData(host.querySelector("form")!);
    expect(data.get("body.th")).toBe(JSON.stringify(doc("ภาษาไทย")));
    expect(data.get("body.en")).toBe(JSON.stringify(doc("English text")));
  });

  it("hydrates an inactive editor from its stashed payload on mount", async () => {
    const restored = doc("Edit made during save");
    const { host } = await render(createElement(BodyForm, { restored }));
    const data = new FormData(host.querySelector("form")!);
    expect(data.get("body.en")).toBe(JSON.stringify(restored));
    await step(() => button(host, "English").click());
    expect(host.querySelector("#f-body-en")?.textContent).toBe("Edit made during save");
  });
});
