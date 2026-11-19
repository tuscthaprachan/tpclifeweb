// @vitest-environment jsdom
import { createElement, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ContentForm } from "@/components/admin/content/ContentForm";
import { TextField } from "@/components/admin/content/fields";
import { takeEdits } from "@/components/admin/content/form/edit-stash";
import { EMPTY_FORM_STATE, type ContentFormState } from "@/lib/admin/content/form-state";
import { render, step } from "../support/dom";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

function setup(action: (prev: ContentFormState, data: FormData) => Promise<ContentFormState>) {
  const props: ComponentProps<typeof ContentForm> = {
    locale: "en",
    action,
    listHref: "/admin/content/news",
    record: { id: "7", status: "draft", updatedAt: "2026-01-01T00:00:00Z" },
    children: createElement("input", { name: "title", defaultValue: "old" }),
  };
  return render(createElement(ContentForm, props));
}

const input = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[name="title"]')!;
const type = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("ContentForm save", () => {
  it("sends one action for two submits while saving, and shows the form unsaved after a failure", async () => {
    let finish: (s: ContentFormState) => void = () => {};
    const action = vi.fn(() => new Promise<ContentFormState>((resolve) => (finish = resolve)));
    const view = await setup(action);
    const form = view.host.querySelector("form")!;
    await step(() => type(input(view.host), "new"));
    await step(() => form.requestSubmit());
    await step(() => form.requestSubmit());
    expect(action).toHaveBeenCalledTimes(1);
    await step(() => finish({ errors: { title: "Required" } }));
    expect(input(view.host).value).toBe("new");
    expect(view.host.ownerDocument.body.textContent).toContain("Required");
    await step(() => form.requestSubmit());
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("keeps text typed during a save across the remount", async () => {
    const action = vi.fn(() => new Promise<ContentFormState>(() => {}));
    const view = await setup(action);
    await step(() => view.host.querySelector("form")!.requestSubmit());
    await step(() => type(input(view.host), "typed while saving"));
    view.unmount();
    expect(takeEdits("/admin/content/news:7")).toEqual([["title", "typed while saving"]]);
  });

  it("puts stashed edits back with a warning", async () => {
    const { stashEdits } = await import("@/components/admin/content/form/edit-stash");
    stashEdits("/admin/content/news:7", [["title", "kept"]]);
    const view = await setup(async () => EMPTY_FORM_STATE);
    expect(input(view.host).value).toBe("kept");
    expect(view.host.textContent).toContain("kept editing while the save ran");
  });
});

describe("ContentForm details panel", () => {
  it("shows the details in the side panel and still posts them with the form", async () => {
    const action = vi.fn(async () => EMPTY_FORM_STATE);
    const view = await render(
      createElement(
        ContentForm,
        {
          locale: "en",
          action,
          listHref: "/admin/content/news",
          details: createElement(TextField, { name: "owner", label: "Owner", defaultValue: "tusu" }),
        } as unknown as ComponentProps<typeof ContentForm>,
        createElement("input", { name: "title", defaultValue: "t" }),
      ),
    );
    const owner = view.host.querySelector<HTMLInputElement>('input[name="owner"]')!;
    const form = view.host.querySelector("form")!;
    expect(form.contains(owner)).toBe(false);
    expect(view.host.querySelector("aside")!.contains(owner)).toBe(true);
    expect(owner.form).toBe(form);
    expect(new FormData(form).get("owner")).toBe("tusu");
  });
});
