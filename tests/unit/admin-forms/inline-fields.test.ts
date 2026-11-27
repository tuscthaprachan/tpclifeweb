// @vitest-environment jsdom
import { createElement, Fragment, type ComponentProps } from "react";
import { expect, it } from "vitest";
import { DocumentCanvas } from "@/components/admin/content/DocumentCanvas";
import { ContentFormProvider } from "@/components/admin/content/context";
import { BilingualTextField, SlugField } from "@/components/admin/content/fields";
import { restoreEntries } from "@/components/admin/content/form/edit-stash";
import { render, step } from "../support/dom";

it("keeps both translations in the form when switching languages and derives the slug from the English title", async () => {
  const view = await render(createElement(ContentFormProvider, {
    value: { locale: "th", errors: {}, pending: false, markDirty: () => {}, formId: "document-form" },
  }, createElement(Fragment, null,
    createElement("form", { id: "document-form" },
      createElement(DocumentCanvas, { locale: "th" } as ComponentProps<typeof DocumentCanvas>,
        createElement(BilingualTextField, {
          appearance: "title", name: "title", label: "Title", defaultValue: { th: "ชื่อเรื่อง", en: "Original title" },
        }),
      ),
    ),
    createElement(SlugField, { label: "Slug" }),
  )));
  const form = view.host.querySelector("form")!;
  const title = (language: "th" | "en") => form.elements.namedItem(`title.${language}`) as HTMLTextAreaElement;
  expect(title("en").closest("[hidden]")).not.toBeNull();
  expect(new FormData(form).get("title.en")).toBe("Original title");

  const buttons = view.host.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
  await step(() => buttons[1]!.click());
  expect(title("en").closest("[hidden]")).toBeNull();
  expect(title("th").closest("[hidden]")).not.toBeNull();

  await step(() => restoreEntries(form, [["title.en", "An updated title"]]));
  expect(new FormData(form).get("slug")).toBe("an-updated-title");

  await step(() => restoreEntries(form, [["slug", "custom-slug"], ["title.th", "ชื่อเรื่องใหม่"]]));
  await step(() => restoreEntries(form, [["title.en", "Another title"]]));
  await step(() => buttons[0]!.click());
  expect(Object.fromEntries(new FormData(form))).toEqual({
    "title.th": "ชื่อเรื่องใหม่",
    "title.en": "Another title",
    slug: "custom-slug",
  });
});

it("preserves line breaks already stored in a single-line field until it is edited", async () => {
  const view = await render(createElement(ContentFormProvider, {
    value: { locale: "en", errors: {}, pending: false, markDirty: () => {}, formId: "document-form" },
  }, createElement("form", { id: "document-form" },
    createElement(DocumentCanvas, { locale: "en" } as ComponentProps<typeof DocumentCanvas>,
      createElement(BilingualTextField, { name: "title", label: "Title", defaultValue: { en: "First\nSecond" } }),
    ),
  )));
  expect(new FormData(view.host.querySelector("form")!).get("title.en")).toBe("First\nSecond");
});
